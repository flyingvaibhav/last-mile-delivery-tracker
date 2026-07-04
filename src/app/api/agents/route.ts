import { NextResponse } from "next/server";
import type { QueryFilter } from "mongoose";
import { getAuthContext } from "@/lib/auth-helper";
import { connectToDatabase } from "@/lib/db";
import { Agent } from "@/lib/models/Agent";
import type { IAgent } from "@/lib/models/Agent";
import { getErrorMessage } from "@/types";

// GET /api/agents - List all agents scoped to environment
export async function GET() {
  try {
    const { userId, isDemo, sessionId } = await getAuthContext();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const query: QueryFilter<IAgent> = {};
    if (isDemo && sessionId) {
      query.isDemo = true;
      query.sessionId = sessionId;
    } else {
      query.$or = [{ isDemo: false }, { isDemo: { $exists: false } }];
    }

    const agents = await Agent.find(query).populate("currentZoneId");
    return NextResponse.json(agents);
  } catch (error: unknown) {
    console.error("GET /api/agents error:", error);
    return NextResponse.json({ error: getErrorMessage(error, "Server Error") }, { status: 500 });
  }
}

// PATCH /api/agents - Update agent status and zone scoped to environment
export async function PATCH(req: Request) {
  try {
    const { userId, role, isDemo, sessionId } = await getAuthContext();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (role !== "agent" && role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const body = await req.json();
    const { availabilityStatus, currentZoneId, clerkId } = body;

    // Admin can update any agent, agent can only update their own
    const targetClerkId = role === "admin" && clerkId ? clerkId : userId;

    const update: Partial<Pick<IAgent, "availabilityStatus" | "currentZoneId">> = {};
    if (availabilityStatus) {
      const validStatuses = ["available", "busy", "offline"];
      if (!validStatuses.includes(availabilityStatus)) {
        return NextResponse.json({ error: "Invalid availability status" }, { status: 400 });
      }
      update.availabilityStatus = availabilityStatus;
    }

    if (currentZoneId !== undefined) {
      update.currentZoneId = currentZoneId ? currentZoneId : null;
    }

    const agent = await Agent.findOneAndUpdate(
      { clerkId: targetClerkId, isDemo, sessionId },
      update,
      { new: true, upsert: true }
    );

    return NextResponse.json(agent);
  } catch (error: unknown) {
    console.error("PATCH /api/agents error:", error);
    return NextResponse.json({ error: getErrorMessage(error, "Server Error") }, { status: 500 });
  }
}
