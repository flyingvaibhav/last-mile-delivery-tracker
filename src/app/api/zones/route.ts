import { NextResponse } from "next/server";
import type { QueryFilter } from "mongoose";
import { getAuthContext } from "@/lib/auth-helper";
import { connectToDatabase } from "@/lib/db";
import { Zone } from "@/lib/models/Zone";
import type { IZone } from "@/lib/models/Zone";
import { Area } from "@/lib/models/Area";
import type { IArea } from "@/lib/models/Area";
import { getErrorMessage } from "@/types";

// GET /api/zones - Fetch all zones with their areas (scoped to environment)
export async function GET() {
  try {
    const { userId, isDemo, sessionId } = await getAuthContext();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    // Scope queries to the active demo session or production
    const query: QueryFilter<IZone> = {};
    if (isDemo && sessionId) {
      query.isDemo = true;
      query.sessionId = sessionId;
    } else {
      query.$or = [{ isDemo: false }, { isDemo: { $exists: false } }];
    }

    const zones = await Zone.find(query).sort({ name: 1 });
    
    // For each zone, fetch its areas scoped to the same sandbox/production
    const zonesWithAreas = await Promise.all(
      zones.map(async (zone) => {
        const areas = await Area.find({ zoneId: zone._id, ...query }).sort({ pincodeOrName: 1 });
        
        // Strip the session ID suffix from pincode names in the response for clean UI display
        const cleanAreas = areas.map((area) => {
          const areaObj = area.toObject();
          if (isDemo && sessionId) {
            const parts = areaObj.pincodeOrName.split("-");
            areaObj.pincodeOrName = parts[0];
          }
          return areaObj;
        });

        return {
          ...zone.toObject(),
          areas: cleanAreas,
        };
      })
    );

    return NextResponse.json(zonesWithAreas);
  } catch (error: unknown) {
    console.error("GET /api/zones error:", error);
    return NextResponse.json({ error: getErrorMessage(error, "Server Error") }, { status: 500 });
  }
}

// POST /api/zones - Manage zones and areas (Admin only, scoped)
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

    // Scope queries to active sandbox/production
    const query: QueryFilter<IArea> = {};
    if (isDemo && sessionId) {
      query.isDemo = true;
      query.sessionId = sessionId;
    } else {
      query.$or = [{ isDemo: false }, { isDemo: { $exists: false } }];
    }

    if (action === "createZone") {
      const { name } = body;
      if (!name) {
        return NextResponse.json({ error: "Zone name is required" }, { status: 400 });
      }

      // Appending suffix to zone names in demo mode to prevent global E11000 duplicate keys
      const finalName = isDemo && sessionId
        ? `${name.trim()} - ${sessionId.substring(5, 11)}`
        : name.trim();

      const newZone = await Zone.create({
        name: finalName,
        isDemo,
        sessionId,
      });
      return NextResponse.json(newZone, { status: 201 });
    }

    if (action === "createArea") {
      const { zoneId, pincodeOrName } = body;
      if (!zoneId || !pincodeOrName) {
        return NextResponse.json({ error: "Zone ID and Pincode/Area Name are required" }, { status: 400 });
      }

      // Appending suffix to pincodes in demo mode to prevent global E11000 duplicate keys
      const finalPincode = isDemo && sessionId
        ? `${pincodeOrName.trim()}-${sessionId.substring(5, 11)}`
        : pincodeOrName.trim();

      // Check if area already exists within the target sandbox/production
      const existingArea = await Area.findOne({
        pincodeOrName: finalPincode,
        ...query,
      });
      if (existingArea) {
        return NextResponse.json({ error: `Pincode/Area "${pincodeOrName}" is already mapped to another zone.` }, { status: 400 });
      }

      const newArea = await Area.create({
        zoneId,
        pincodeOrName: finalPincode,
        isDemo,
        sessionId,
      });
      return NextResponse.json(newArea, { status: 201 });
    }

    if (action === "deleteArea") {
      const { areaId } = body;
      if (!areaId) {
        return NextResponse.json({ error: "Area ID is required" }, { status: 400 });
      }
      await Area.findByIdAndDelete(areaId);
      return NextResponse.json({ message: "Area deleted successfully" });
    }

    if (action === "deleteZone") {
      const { zoneId } = body;
      if (!zoneId) {
        return NextResponse.json({ error: "Zone ID is required" }, { status: 400 });
      }
      // Delete the zone
      await Zone.findByIdAndDelete(zoneId);
      // Delete associated areas
      await Area.deleteMany({ zoneId });
      return NextResponse.json({ message: "Zone and associated areas deleted successfully" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    console.error("POST /api/zones error:", error);
    return NextResponse.json({ error: getErrorMessage(error, "Server Error") }, { status: 500 });
  }
}
