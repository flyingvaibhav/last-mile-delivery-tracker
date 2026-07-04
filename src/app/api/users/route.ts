import { NextResponse } from "next/server";
import type { QueryFilter } from "mongoose";
import { clerkClient } from "@clerk/nextjs/server";
import { getAuthContext } from "@/lib/auth-helper";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/lib/models/User";
import type { IUser } from "@/lib/models/User";
import { Agent } from "@/lib/models/Agent";
import { getErrorMessage } from "@/types";

// GET /api/users - List all users (Admin only, scoped)
export async function GET() {
  try {
    const { userId, role, isDemo, sessionId } = await getAuthContext();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    await connectToDatabase();

    const query: QueryFilter<IUser> = {};
    if (isDemo && sessionId) {
      query.isDemo = true;
      query.sessionId = sessionId;
    } else {
      query.$or = [{ isDemo: false }, { isDemo: { $exists: false } }];
    }

    const users = await User.find(query).sort({ createdAt: -1 });

    // Populate agent metadata for agent roles scoped to this environment
    const usersWithAgentInfo = await Promise.all(
      users.map(async (user) => {
        const userObj = user.toObject();
        if (user.role === "agent") {
          const agentData = await Agent.findOne({ clerkId: user.clerkId, ...query })
            .populate("currentZoneId");
          userObj.agentInfo = agentData || null;
        }
        return userObj;
      })
    );

    return NextResponse.json(usersWithAgentInfo);
  } catch (error: unknown) {
    console.error("GET /api/users error:", error);
    return NextResponse.json({ error: getErrorMessage(error, "Server Error") }, { status: 500 });
  }
}

// PATCH /api/users - Update user role in Clerk and MongoDB (Admin only, scoped)
export async function PATCH(req: Request) {
  try {
    const { userId: adminId, role: adminRole, isDemo, sessionId } = await getAuthContext();
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (adminRole !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    await connectToDatabase();
    const body = await req.json();
    const { targetUserId, role } = body;

    if (!targetUserId || !role) {
      return NextResponse.json({ error: "targetUserId and role are required" }, { status: 400 });
    }

    const validRoles = ["customer", "agent", "admin"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role value" }, { status: 400 });
    }

    // Setup environment-scoped query constraints
    const baseQuery: QueryFilter<IUser> = { isDemo, sessionId };
    if (!isDemo) {
      baseQuery.$or = [{ isDemo: false }, { isDemo: { $exists: false } }];
    }

    // 1. Update Clerk publicMetadata (ONLY for real production users)
    if (!isDemo) {
      try {
        const client = await clerkClient();
        await client.users.updateUserMetadata(targetUserId, {
          publicMetadata: {
            role,
          },
        });
      } catch (clerkError: unknown) {
        console.error("[Clerk Promotion Error] Failed to update metadata:", clerkError);
        return NextResponse.json({ error: `Clerk metadata update failed: ${getErrorMessage(clerkError)}` }, { status: 500 });
      }
    } else {
      console.log(`[Demo Role Sync] Bypassing Clerk API metadata write for mock ID: ${targetUserId}`);
    }

    // 2. Update MongoDB User record
    const updatedUser = await User.findOneAndUpdate(
      { clerkId: targetUserId, ...baseQuery },
      { role },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: "User record not found in MongoDB database" }, { status: 404 });
    }

    // 3. Synchronize Agent collections scoped to this environment
    if (role === "agent") {
      await Agent.findOneAndUpdate(
        { clerkId: targetUserId, isDemo, sessionId },
        { $setOnInsert: { availabilityStatus: "available" } },
        { upsert: true, new: true }
      );
    } else {
      await Agent.deleteOne({ clerkId: targetUserId, isDemo, sessionId });
    }

    return NextResponse.json({
      message: `Successfully promoted user to ${role}`,
      user: updatedUser,
    });
  } catch (error: unknown) {
    console.error("PATCH /api/users error:", error);
    return NextResponse.json({ error: getErrorMessage(error, "Server Error") }, { status: 500 });
  }
}
