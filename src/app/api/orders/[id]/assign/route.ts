import { NextResponse } from "next/server";
import type { QueryFilter } from "mongoose";
import { getAuthContext } from "@/lib/auth-helper";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models/Order";
import { Agent } from "@/lib/models/Agent";
import { User } from "@/lib/models/User";
import type { IUser } from "@/lib/models/User";
import { OrderStatusHistory } from "@/lib/models/OrderStatusHistory";
import { triggerStatusUpdateEmail, triggerStatusUpdateSMS } from "@/lib/email";
import { getErrorMessage } from "@/types";

// POST /api/orders/[id]/assign - Assign an agent to an order (Admin only, scoped)
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const { userId, role, isDemo, sessionId } = await getAuthContext();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    await connectToDatabase();
    const orderId = params.id;
    const body = await req.json();
    const { action, agentId } = body;

    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Strict Data Isolation Gate
    if (isDemo && sessionId) {
      if (!order.isDemo || order.sessionId !== sessionId) {
        return NextResponse.json({ error: "Order not found in this demo sandbox" }, { status: 404 });
      }
    } else {
      if (order.isDemo) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
    }

    let assignedAgentId = "";
    let assignedAgentName = "";

    // Setup base query constraint for users/agents
    const baseQuery: QueryFilter<IUser> = { isDemo, sessionId };
    if (!isDemo) {
      baseQuery.$or = [{ isDemo: false }, { isDemo: { $exists: false } }];
    }

    // Lookup admin name
    const adminUser = await User.findOne({ clerkId: userId, ...baseQuery });
    const adminName = adminUser?.name || "Admin";

    if (action === "manual") {
      if (!agentId) {
        return NextResponse.json({ error: "Agent ID is required for manual assignment" }, { status: 400 });
      }

      // Check if agent is valid inside the target environment
      const agentUser = await User.findOne({ clerkId: agentId, role: "agent", ...baseQuery });
      if (!agentUser) {
        return NextResponse.json({ error: "Selected user is not a valid agent" }, { status: 400 });
      }

      assignedAgentId = agentId;
      assignedAgentName = agentUser.name;
    } else if (action === "auto") {
      // Auto assign logic scoped to active environment:
      // 1. Try to find an available agent in the same pickup zone
      let agentRecord = await Agent.findOne({
        availabilityStatus: "available",
        currentZoneId: order.pickupZoneId,
        ...baseQuery,
      });

      // 2. Fallback: Find any available agent globally in this environment
      if (!agentRecord) {
        agentRecord = await Agent.findOne({
          availabilityStatus: "available",
          ...baseQuery,
        });
      }

      if (!agentRecord) {
        return NextResponse.json(
          { error: "No available delivery agents found at this time." },
          { status: 404 }
        );
      }

      assignedAgentId = agentRecord.clerkId;
      const agentUser = await User.findOne({ clerkId: assignedAgentId, ...baseQuery });
      assignedAgentName = agentUser?.name || "Delivery Agent";
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Capture old agent
    const oldAgentId = order.agentId;

    // Update order with new agent
    order.agentId = assignedAgentId;
    await order.save();

    // Set new agent status to busy
    await Agent.findOneAndUpdate(
      { clerkId: assignedAgentId, ...baseQuery },
      { availabilityStatus: "busy" }
    );

    // If there was an old agent assigned, set them back to available
    if (oldAgentId && oldAgentId !== assignedAgentId) {
      await Agent.findOneAndUpdate(
        { clerkId: oldAgentId, ...baseQuery },
        { availabilityStatus: "available" }
      );
    }

    // Write to audit log
    await OrderStatusHistory.create({
      orderId: order._id,
      status: order.status,
      changedBy: userId,
      changedByName: `${adminName} assigned Agent: ${assignedAgentName}`,
      isDemo,
      sessionId,
    });

    // Send email to customer
    const customerUser = await User.findOne({ clerkId: order.customerId, ...baseQuery });
    if (customerUser) {
      triggerStatusUpdateEmail({
        orderId: order._id.toString(),
        customerEmail: customerUser.email,
        customerName: customerUser.name,
        status: order.status,
        pickupAddress: order.pickupAddress,
        dropAddress: order.dropAddress,
        charge: order.charge,
        isDemo,
        sessionId,
      });

      if (customerUser.phone) {
        triggerStatusUpdateSMS({
          orderId: order._id.toString(),
          customerPhone: customerUser.phone,
          customerName: customerUser.name,
          status: order.status,
          charge: order.charge,
          isDemo,
          sessionId,
        });
      }
    }

    return NextResponse.json({
      message: `Successfully assigned to ${assignedAgentName}`,
      order,
    });
  } catch (error: unknown) {
    console.error(`POST /api/orders/${params.id}/assign error:`, error);
    return NextResponse.json({ error: getErrorMessage(error, "Server Error") }, { status: 500 });
  }
}
