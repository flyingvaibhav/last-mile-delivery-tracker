import { NextResponse } from "next/server";
import type { QueryFilter } from "mongoose";
import { getAuthContext } from "@/lib/auth-helper";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models/Order";
import { User } from "@/lib/models/User";
import type { IUser } from "@/lib/models/User";
import { Agent } from "@/lib/models/Agent";
import type { IAgent } from "@/lib/models/Agent";
import { OrderStatusHistory } from "@/lib/models/OrderStatusHistory";
import type { IOrderStatusHistory } from "@/lib/models/OrderStatusHistory";
import { triggerStatusUpdateEmail, triggerStatusUpdateSMS } from "@/lib/email";
import { getErrorMessage } from "@/types";

// GET /api/orders/[id] - Fetch detailed order status and history (scoped)
export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const { userId, role, isDemo, sessionId } = await getAuthContext();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const orderId = params.id;

    const order = await Order.findById(orderId)
      .populate("pickupZoneId")
      .populate("dropZoneId");

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

    // Role-based Gating checks
    if (role === "customer" && order.customerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (role === "agent" && order.agentId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch history logs scoped to the environment
    const historyQuery: QueryFilter<IOrderStatusHistory> = { orderId: order._id };
    if (isDemo && sessionId) {
      historyQuery.isDemo = true;
      historyQuery.sessionId = sessionId;
    } else {
      historyQuery.$or = [{ isDemo: false }, { isDemo: { $exists: false } }];
    }

    const history = await OrderStatusHistory.find(historyQuery).sort({ timestamp: 1 });

    return NextResponse.json({ order, history });
  } catch (error: unknown) {
    console.error(`GET /api/orders/${params.id} error:`, error);
    return NextResponse.json({ error: getErrorMessage(error, "Server Error") }, { status: 500 });
  }
}

// PATCH /api/orders/[id] - Update order status or reschedule (scoped)
export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const { userId, role, isDemo, sessionId } = await getAuthContext();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const orderId = params.id;
    const body = await req.json();
    const { status, failedReason, rescheduledDate } = body;

    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Sandbox isolation guard
    if (isDemo && sessionId) {
      if (!order.isDemo || order.sessionId !== sessionId) {
        return NextResponse.json({ error: "Order not found in this demo sandbox" }, { status: 404 });
      }
    } else {
      if (order.isDemo) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
    }

    // Setup user queries scoped to the environment
    const userQuery: QueryFilter<IUser> = { isDemo, sessionId };
    if (!isDemo) {
      userQuery.$or = [{ isDemo: false }, { isDemo: { $exists: false } }];
    }

    // Lookup customer details for notifications
    const customerUser = await User.findOne({ clerkId: order.customerId, ...userQuery });
    const customerEmail = customerUser?.email || "customer@deliverytracker.com";
    const customerName = customerUser?.name || "Customer";

    // Lookup actor details
    const actorUser = await User.findOne({ clerkId: userId, ...userQuery });
    const actorName = actorUser?.name || (role === "admin" ? "Admin" : role === "agent" ? "Delivery Agent" : "Customer");

    // 1. CUSTOMER FLOW: Reschedule delivery
    if (role === "customer") {
      if (order.customerId !== userId) {
        return NextResponse.json({ error: "Forbidden: Not your order" }, { status: 403 });
      }

      if (rescheduledDate) {
        if (order.status !== "Failed") {
          return NextResponse.json({ error: "Can only reschedule failed deliveries" }, { status: 400 });
        }

        order.status = "Pending";
        order.rescheduledDate = new Date(rescheduledDate);
        order.agentId = undefined;
        order.failedReason = undefined;
        await order.save();

        await OrderStatusHistory.create({
          orderId: order._id,
          status: "Pending",
          changedBy: userId,
          changedByName: `${customerName} (Rescheduled to ${new Date(rescheduledDate).toLocaleDateString()})`,
          isDemo,
          sessionId,
        });

        triggerStatusUpdateEmail({
          orderId: order._id.toString(),
          customerEmail,
          customerName,
          status: "Pending",
          pickupAddress: order.pickupAddress,
          dropAddress: order.dropAddress,
          charge: order.charge,
          rescheduledDate: order.rescheduledDate,
          isDemo,
          sessionId,
        });

        if (customerUser?.phone) {
          triggerStatusUpdateSMS({
            orderId: order._id.toString(),
            customerPhone: customerUser.phone,
            customerName,
            status: "Pending",
            charge: order.charge,
            isDemo,
            sessionId,
          });
        }

        return NextResponse.json(order);
      }

      return NextResponse.json({ error: "Customers can only reschedule failed orders." }, { status: 400 });
    }

    // 2. AGENT FLOW: Progress shipment or fail it
    if (role === "agent") {
      const isUnassignedPending = order.status === "Pending" && (!order.agentId || order.agentId === "");

      if (order.agentId !== userId && !isUnassignedPending) {
        return NextResponse.json({ error: "Forbidden: Order not assigned to you" }, { status: 403 });
      }

      if (!status) {
        return NextResponse.json({ error: "Status field is required" }, { status: 400 });
      }

      const validStatuses = ["Picked Up", "In Transit", "Out for Delivery", "Delivered", "Failed"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: "Invalid status value for agent" }, { status: 400 });
      }

      // If claiming an unassigned pending order, assign to agent and mark agent as busy
      if (isUnassignedPending) {
        order.agentId = userId;
        const agentQuery: QueryFilter<IAgent> = { clerkId: userId };
        if (isDemo && sessionId) {
          agentQuery.isDemo = true;
          agentQuery.sessionId = sessionId;
        } else {
          agentQuery.$or = [{ isDemo: false }, { isDemo: { $exists: false } }];
        }
        await Agent.findOneAndUpdate(
          agentQuery,
          { availabilityStatus: "busy" },
          { upsert: true }
        );
      }

      // If marking as delivered or failed, free up the agent
      if (status === "Failed" || status === "Delivered") {
        const agentQuery: QueryFilter<IAgent> = { clerkId: userId };
        if (isDemo && sessionId) {
          agentQuery.isDemo = true;
          agentQuery.sessionId = sessionId;
        } else {
          agentQuery.$or = [{ isDemo: false }, { isDemo: { $exists: false } }];
        }
        await Agent.findOneAndUpdate(agentQuery, { availabilityStatus: "available" });
      }

      if (status === "Failed") {
        if (!failedReason) {
          return NextResponse.json({ error: "Failed reason is required when marking delivery as failed" }, { status: 400 });
        }
        order.status = "Failed";
        order.failedReason = failedReason;
      } else {
        order.status = status;
        order.failedReason = undefined;
      }

      await order.save();

      await OrderStatusHistory.create({
        orderId: order._id,
        status: status,
        changedBy: userId,
        changedByName: `Agent: ${actorName}`,
        isDemo,
        sessionId,
      });

      triggerStatusUpdateEmail({
        orderId: order._id.toString(),
        customerEmail,
        customerName,
        status: status,
        pickupAddress: order.pickupAddress,
        dropAddress: order.dropAddress,
        charge: order.charge,
        failedReason: failedReason,
        isDemo,
        sessionId,
      });

      if (customerUser?.phone) {
        triggerStatusUpdateSMS({
          orderId: order._id.toString(),
          customerPhone: customerUser.phone,
          customerName,
          status: status,
          charge: order.charge,
          failedReason: failedReason,
          isDemo,
          sessionId,
        });
      }

      return NextResponse.json(order);
    }

    // 3. ADMIN FLOW: Override status
    if (role === "admin") {
      if (status) {
        order.status = status;
        if (status === "Failed") {
          order.failedReason = failedReason || "Marked failed by Admin";
        } else {
          order.failedReason = undefined;
        }
      }

      if (rescheduledDate) {
        order.rescheduledDate = new Date(rescheduledDate);
      }

      await order.save();

      await OrderStatusHistory.create({
        orderId: order._id,
        status: order.status,
        changedBy: userId,
        changedByName: `Admin: ${actorName}`,
        isDemo,
        sessionId,
      });

      triggerStatusUpdateEmail({
        orderId: order._id.toString(),
        customerEmail,
        customerName,
        status: order.status,
        pickupAddress: order.pickupAddress,
        dropAddress: order.dropAddress,
        charge: order.charge,
        failedReason: order.failedReason,
        isDemo,
        sessionId,
      });

      if (customerUser?.phone) {
        triggerStatusUpdateSMS({
          orderId: order._id.toString(),
          customerPhone: customerUser.phone,
          customerName,
          status: order.status,
          charge: order.charge,
          failedReason: order.failedReason,
          isDemo,
          sessionId,
        });
      }

      return NextResponse.json(order);
    }

    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  } catch (error: unknown) {
    console.error(`PATCH /api/orders/${params.id} error:`, error);
    return NextResponse.json({ error: getErrorMessage(error, "Server Error") }, { status: 500 });
  }
}
