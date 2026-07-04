import { NextResponse } from "next/server";
import type { QueryFilter } from "mongoose";
import { getAuthContext } from "@/lib/auth-helper";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models/Order";
import type { IOrder } from "@/lib/models/Order";
import { User } from "@/lib/models/User";
import type { IUser } from "@/lib/models/User";
import { Agent } from "@/lib/models/Agent";
import type { IAgent } from "@/lib/models/Agent";
import { getErrorMessage } from "@/types";
import { OrderStatusHistory } from "@/lib/models/OrderStatusHistory";
import { calculateOrderCharge } from "@/lib/pricing";
import { triggerStatusUpdateEmail, triggerStatusUpdateSMS } from "@/lib/email";

// GET /api/orders - Fetch orders list (scoped)
export async function GET(req: Request) {
  try {
    const { userId, role, isDemo, sessionId } = await getAuthContext();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    // Build environment-scoped query
    const query: QueryFilter<IOrder> = {};
    if (isDemo && sessionId) {
      query.isDemo = true;
      query.sessionId = sessionId;
    } else {
      query.$or = [{ isDemo: false }, { isDemo: { $exists: false } }];
    }

    // Apply role-based filters
    if (role === "customer") {
      query.customerId = userId;
    } else if (role === "agent") {
      const pool = searchParams.get("pool");
      if (pool === "true") {
        // Query unassigned pending orders
        query.status = "Pending";
        query.$or = [
          { agentId: { $exists: false } },
          { agentId: null },
          { agentId: "" }
        ];
        
        // Filter by the agent's current operating zone if set
        const agentQuery: QueryFilter<IAgent> = { clerkId: userId };
        if (isDemo && sessionId) {
          agentQuery.isDemo = true;
          agentQuery.sessionId = sessionId;
        } else {
          agentQuery.$or = [{ isDemo: false }, { isDemo: { $exists: false } }];
        }
        const agentRecord = await Agent.findOne(agentQuery);
        if (agentRecord && agentRecord.currentZoneId) {
          query.pickupZoneId = agentRecord.currentZoneId;
        }
      } else {
        query.agentId = userId;
      }
    } else if (role === "admin") {
      // Admins can apply filters
      const status = searchParams.get("status");
      const agentId = searchParams.get("agentId");
      const customerId = searchParams.get("customerId");
      const pickupZoneId = searchParams.get("pickupZoneId");
      const dropZoneId = searchParams.get("dropZoneId");
      const startDate = searchParams.get("startDate");
      const endDate = searchParams.get("endDate");

      if (status) query.status = status as IOrder["status"];
      if (agentId) query.agentId = agentId === "unassigned" ? null : agentId;
      if (customerId) query.customerId = customerId;
      if (pickupZoneId) query.pickupZoneId = pickupZoneId;
      if (dropZoneId) query.dropZoneId = dropZoneId;
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          query.createdAt.$lte = end;
        }
      }
    }

    const orders = await Order.find(query)
      .populate("pickupZoneId")
      .populate("dropZoneId")
      .sort({ createdAt: -1 });

    return NextResponse.json(orders);
  } catch (error: unknown) {
    console.error("GET /api/orders error:", error);
    return NextResponse.json({ error: getErrorMessage(error, "Server Error") }, { status: 500 });
  }
}

// POST /api/orders - Create order or get pricing preview (scoped with rate limiting)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      pickupAddress,
      pickupPincode,
      dropAddress,
      dropPincode,
      l,
      b,
      h,
      actualWeight,
      orderType,
      paymentType,
      preview = false,
      customerId, // For admins booking on behalf
      senderName,
      senderPhone,
      recipientName,
      recipientPhone,
      vehicleType = "2-Wheeler",
    } = body;

    const { userId, role, isDemo, sessionId } = await getAuthContext();
    if (!userId && !preview) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    // Validation
    if (
      !pickupAddress ||
      !pickupPincode ||
      !dropAddress ||
      !dropPincode ||
      !l ||
      !b ||
      !h ||
      !actualWeight ||
      !orderType ||
      !paymentType
    ) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (!preview && (!senderName || !senderPhone || !recipientName || !recipientPhone)) {
      return NextResponse.json({ error: "Sender and recipient contact details are required" }, { status: 400 });
    }

    // Demo Mode Rate Limiting Guardrail (Max 20 orders per demo session)
    if (isDemo && sessionId && !preview) {
      const demoOrderCount = await Order.countDocuments({ isDemo: true, sessionId });
      if (demoOrderCount >= 20) {
        return NextResponse.json(
          { error: "Demo limit reached: Maximum 20 orders allowed per demo session to prevent abuse." },
          { status: 429 }
        );
      }
    }

    // Call pricing engine with environment parameters
    let priceDetails;
    try {
      priceDetails = await calculateOrderCharge({
        pickupPincode,
        dropPincode,
        l: Number(l),
        b: Number(b),
        h: Number(h),
        actualWeight: Number(actualWeight),
        orderType,
        paymentType,
        vehicleType,
        isDemo,
        sessionId,
      });
    } catch (pricingError: unknown) {
      return NextResponse.json({ error: getErrorMessage(pricingError, "Pricing Engine calculation failed") }, { status: 400 });
    }

    if (preview) {
      return NextResponse.json(priceDetails);
    }

    // Determine target customerId
    let targetCustomerId = userId;
    if (role === "admin" && customerId) {
      targetCustomerId = customerId;
    }

    // Lookup customer name/email (scoped to environment)
    const userQuery: QueryFilter<IUser> = { clerkId: targetCustomerId };
    if (isDemo && sessionId) {
      userQuery.isDemo = true;
      userQuery.sessionId = sessionId;
    } else {
      userQuery.$or = [{ isDemo: false }, { isDemo: { $exists: false } }];
    }
    const customerUser = await User.findOne(userQuery);
    
    const customerEmail = customerUser?.email || "customer@deliverytracker.com";
    const customerName = customerUser?.name || "Customer";

    // Create the order
    const order = await Order.create({
      customerId: targetCustomerId,
      pickupAddress,
      pickupPincode,
      pickupZoneId: priceDetails.pickupZone._id,
      dropAddress,
      dropPincode,
      dropZoneId: priceDetails.dropZone._id,
      dimensions: {
        l: Number(l),
        b: Number(b),
        h: Number(h),
      },
      actualWeight: Number(actualWeight),
      volumetricWeight: priceDetails.volumetricWeight,
      billedWeight: priceDetails.billedWeight,
      orderType,
      paymentType,
      charge: priceDetails.charge,
      status: "Pending",
      isDemo,
      sessionId,
      senderName,
      senderPhone,
      recipientName,
      recipientPhone,
      vehicleType,
    });

    // Create entry in OrderStatusHistory
    await OrderStatusHistory.create({
      orderId: order._id,
      status: "Pending",
      changedBy: userId,
      changedByName: role === "admin" ? "Admin (On behalf of Customer)" : customerName,
      isDemo,
      sessionId,
    });

    // Trigger status update email (scoped to bypass SMTP if demo)
    triggerStatusUpdateEmail({
      orderId: order._id.toString(),
      customerEmail,
      customerName,
      status: "Pending",
      pickupAddress,
      dropAddress,
      charge: priceDetails.charge,
      isDemo,
      sessionId,
    });

    if (senderPhone) {
      triggerStatusUpdateSMS({
        orderId: order._id.toString(),
        customerPhone: senderPhone,
        customerName,
        status: "Pending",
        charge: priceDetails.charge,
        isDemo,
        sessionId,
      });
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/orders error:", error);
    return NextResponse.json({ error: getErrorMessage(error, "Server Error") }, { status: 500 });
  }
}
