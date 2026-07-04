import { NextResponse } from "next/server";
import type { QueryFilter } from "mongoose";
import { getAuthContext } from "@/lib/auth-helper";
import { connectToDatabase } from "@/lib/db";
import { RateCard } from "@/lib/models/RateCard";
import type { IRateCard } from "@/lib/models/RateCard";
import { CODSurcharge } from "@/lib/models/CODSurcharge";
import { getErrorMessage } from "@/types";

// GET /api/rates - Fetch all rate cards and COD surcharges (scoped)
export async function GET() {
  try {
    const { userId, isDemo, sessionId } = await getAuthContext();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const query: QueryFilter<IRateCard> = {};
    if (isDemo && sessionId) {
      query.isDemo = true;
      query.sessionId = sessionId;
    } else {
      query.$or = [{ isDemo: false }, { isDemo: { $exists: false } }];
    }

    const rateCards = await RateCard.find(query)
      .populate("zoneFrom")
      .populate("zoneTo")
      .sort({ orderType: 1 });

    const codSurcharges = await CODSurcharge.find({});

    return NextResponse.json({ rateCards, codSurcharges });
  } catch (error: unknown) {
    console.error("GET /api/rates error:", error);
    return NextResponse.json({ error: getErrorMessage(error, "Server Error") }, { status: 500 });
  }
}

// POST /api/rates - Manage rate cards and COD surcharges (Admin only, scoped)
export async function POST(req: Request) {
  try {
    const { userId, role, isDemo, sessionId } = await getAuthContext();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    await connectToDatabase();
    const body = await req.json();
    const { action } = body;

    if (action === "upsertRateCard") {
      const { orderType, zoneFrom, zoneTo, baseCharge, ratePerKg } = body;

      if (!orderType || !zoneFrom || !zoneTo || baseCharge === undefined || ratePerKg === undefined) {
        return NextResponse.json(
          { error: "orderType, zoneFrom, zoneTo, baseCharge, and ratePerKg are required" },
          { status: 400 }
        );
      }

      // Upsert the rate card matching orderType, zoneFrom, zoneTo and demo environment
      const rateCard = await RateCard.findOneAndUpdate(
        { orderType, zoneFrom, zoneTo, isDemo, sessionId },
        { baseCharge, ratePerKg },
        { upsert: true, new: true }
      );

      return NextResponse.json(rateCard);
    }

    if (action === "upsertCODSurcharge") {
      const { orderType, surchargeAmount } = body;

      if (!orderType || surchargeAmount === undefined) {
        return NextResponse.json({ error: "orderType and surchargeAmount are required" }, { status: 400 });
      }

      const surcharge = await CODSurcharge.findOneAndUpdate(
        { orderType },
        { surchargeAmount },
        { upsert: true, new: true }
      );

      return NextResponse.json(surcharge);
    }

    if (action === "deleteRateCard") {
      const { rateCardId } = body;
      if (!rateCardId) {
        return NextResponse.json({ error: "Rate Card ID is required" }, { status: 400 });
      }

      await RateCard.findByIdAndDelete(rateCardId);
      return NextResponse.json({ message: "Rate Card deleted successfully" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    console.error("POST /api/rates error:", error);
    return NextResponse.json({ error: getErrorMessage(error, "Server Error") }, { status: 500 });
  }
}
