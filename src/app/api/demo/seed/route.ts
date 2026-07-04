import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/db";
import { Zone } from "@/lib/models/Zone";
import { Area } from "@/lib/models/Area";
import { RateCard } from "@/lib/models/RateCard";
import { CODSurcharge } from "@/lib/models/CODSurcharge";
import { Order } from "@/lib/models/Order";
import { OrderStatusHistory } from "@/lib/models/OrderStatusHistory";
import { Agent } from "@/lib/models/Agent";
import { User } from "@/lib/models/User";
import { DemoNotification } from "@/lib/models/DemoNotification";
import { getErrorMessage } from "@/types";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { role } = body;

    if (!role || !["customer", "agent", "admin"].includes(role)) {
      return NextResponse.json({ error: "Invalid or missing role" }, { status: 400 });
    }

    // 1. Resolve or Generate Session ID
    const cookieStore = await cookies();
    let sessionId = cookieStore.get("demo_session")?.value
      ? JSON.parse(cookieStore.get("demo_session")!.value).sessionId
      : null;

    if (!sessionId) {
      sessionId = `sess_${Math.random().toString(36).substring(2, 11)}${Date.now().toString(36)}`;
    }

    console.log(`[Demo Seed] Seeding demo sandbox for role: ${role}, session: ${sessionId}`);

    // Derive a unique suffix from the sessionId (e.g. 6 chars) to satisfy the global unique indexes
    const suffix = sessionId.substring(5, 11);

    // 2. Wipe existing demo data for this specific session ID.
    // We delete by { isDemo: true, sessionId } and fallback to suffix-matching to purge legacy database records.
    await Zone.deleteMany({
      $or: [{ isDemo: true, sessionId }, { name: { $regex: suffix } }],
    });
    await Area.deleteMany({
      $or: [{ isDemo: true, sessionId }, { pincodeOrName: { $regex: suffix } }],
    });
    await User.deleteMany({
      $or: [
        { isDemo: true, sessionId },
        { email: { $regex: suffix } },
        { clerkId: { $regex: sessionId } },
      ],
    });

    await RateCard.deleteMany({ isDemo: true, sessionId });
    await CODSurcharge.deleteMany({ isDemo: true, sessionId });
    await Order.deleteMany({ isDemo: true, sessionId });
    await OrderStatusHistory.deleteMany({ isDemo: true, sessionId });
    await Agent.deleteMany({ isDemo: true, sessionId });
    await DemoNotification.deleteMany({ sessionId });

    // 3. SEED DATA

    // A. Seed Zones with unique suffix names
    const zoneNorth = await Zone.create({ name: `Demo Zone (North) - ${suffix}`, isDemo: true, sessionId });
    const zoneSouth = await Zone.create({ name: `Demo Zone (South) - ${suffix}`, isDemo: true, sessionId });
    const zoneWest = await Zone.create({ name: `Demo Zone (West) - ${suffix}`, isDemo: true, sessionId });

    // B. Seed Areas with unique suffix pincodes
    await Area.create({ zoneId: zoneNorth._id, pincodeOrName: `110001-${suffix}`, isDemo: true, sessionId });
    await Area.create({ zoneId: zoneSouth._id, pincodeOrName: `220002-${suffix}`, isDemo: true, sessionId });
    await Area.create({ zoneId: zoneWest._id, pincodeOrName: `330003-${suffix}`, isDemo: true, sessionId });

    // C. Seed Rate Cards (B2B & B2C, Intra & Inter-zone)
    // Intra North
    await RateCard.create({
      orderType: "B2C",
      zoneFrom: zoneNorth._id,
      zoneTo: zoneNorth._id,
      baseCharge: 40,
      ratePerKg: 5,
      isDemo: true,
      sessionId,
    });
    await RateCard.create({
      orderType: "B2B",
      zoneFrom: zoneNorth._id,
      zoneTo: zoneNorth._id,
      baseCharge: 80,
      ratePerKg: 8,
      isDemo: true,
      sessionId,
    });

    // Inter North -> South
    await RateCard.create({
      orderType: "B2C",
      zoneFrom: zoneNorth._id,
      zoneTo: zoneSouth._id,
      baseCharge: 75,
      ratePerKg: 10,
      isDemo: true,
      sessionId,
    });
    await RateCard.create({
      orderType: "B2B",
      zoneFrom: zoneNorth._id,
      zoneTo: zoneSouth._id,
      baseCharge: 150,
      ratePerKg: 15,
      isDemo: true,
      sessionId,
    });

    // Inter North -> West
    await RateCard.create({
      orderType: "B2C",
      zoneFrom: zoneNorth._id,
      zoneTo: zoneWest._id,
      baseCharge: 90,
      ratePerKg: 12,
      isDemo: true,
      sessionId,
    });

    // D. Seed COD Surcharges (Upsert globally to satisfy MongoDB global unique index constraint)
    await CODSurcharge.findOneAndUpdate(
      { orderType: "B2C" },
      { surchargeAmount: 15 },
      { upsert: true }
    );
    await CODSurcharge.findOneAndUpdate(
      { orderType: "B2B" },
      { surchargeAmount: 35 },
      { upsert: true }
    );

    // E. Seed Users (Including the active demo user and mock agents)
    const activeDemoClerkId = `demo-${role}-${sessionId}`;
    
    // Seed active explorer account with unique email address
    const activeUser = await User.create({
      clerkId: activeDemoClerkId,
      name: `Demo User (${role.toUpperCase()})`,
      email: `demo-${role}-${suffix}@example.com`,
      role,
      phone: "+1 555-019-2834",
      isDemo: true,
      sessionId,
    });

    // Seed mock agents in Users & Agents collections with unique email addresses
    const agentAliceId = `demo-agent-alice-${sessionId}`;
    const agentBobId = `demo-agent-bob-${sessionId}`;
    const agentCharlieId = `demo-agent-charlie-${sessionId}`;

    await User.create({
      clerkId: agentAliceId,
      name: "Agent Alice (Demo)",
      email: `alice.demo-${suffix}@example.com`,
      role: "agent",
      phone: "+1 555-010-0001",
      isDemo: true,
      sessionId,
    });
    await Agent.create({
      clerkId: agentAliceId,
      currentZoneId: zoneNorth._id,
      availabilityStatus: "available",
      isDemo: true,
      sessionId,
    });

    await User.create({
      clerkId: agentBobId,
      name: "Agent Bob (Demo)",
      email: `bob.demo-${suffix}@example.com`,
      role: "agent",
      phone: "+1 555-010-0002",
      isDemo: true,
      sessionId,
    });
    await Agent.create({
      clerkId: agentBobId,
      currentZoneId: zoneSouth._id,
      availabilityStatus: "busy",
      isDemo: true,
      sessionId,
    });

    await User.create({
      clerkId: agentCharlieId,
      name: "Agent Charlie (Demo)",
      email: `charlie.demo-${suffix}@example.com`,
      role: "agent",
      phone: "+1 555-010-0003",
      isDemo: true,
      sessionId,
    });
    await Agent.create({
      clerkId: agentCharlieId,
      currentZoneId: zoneWest._id,
      availabilityStatus: "offline",
      isDemo: true,
      sessionId,
    });

    // F. Seed Sample Orders & Histories
    const demoCustomerId = `demo-customer-${sessionId}`;
    
    // Ensure customer account exists in Users table so it populates details with unique email
    if (role !== "customer") {
      await User.create({
        clerkId: demoCustomerId,
        name: "Demo Customer",
        email: `demo-customer-${suffix}@example.com`,
        role: "customer",
        phone: "+1 555-012-3456",
        isDemo: true,
        sessionId,
      });
    }

    // Order 1: In Transit (Agent Bob)
    const order1 = await Order.create({
      customerId: demoCustomerId,
      agentId: agentBobId,
      pickupAddress: "123 North Ave",
      pickupPincode: "110001",
      pickupZoneId: zoneNorth._id,
      dropAddress: "456 South Rd",
      dropPincode: "220002",
      dropZoneId: zoneSouth._id,
      dimensions: { l: 20, b: 15, h: 10 },
      actualWeight: 1.5,
      volumetricWeight: 0.6,
      billedWeight: 1.5,
      orderType: "B2C",
      paymentType: "Prepaid",
      charge: 90.0, // base 75 + 1.5*10
      status: "In Transit",
      isDemo: true,
      sessionId,
    });

    await OrderStatusHistory.create({ orderId: order1._id, status: "Pending", changedBy: demoCustomerId, changedByName: "Demo Customer", timestamp: new Date(Date.now() - 3600000 * 3), isDemo: true, sessionId });
    await OrderStatusHistory.create({ orderId: order1._id, status: "Picked Up", changedBy: agentBobId, changedByName: "Agent Bob (Demo)", timestamp: new Date(Date.now() - 3600000 * 2), isDemo: true, sessionId });
    await OrderStatusHistory.create({ orderId: order1._id, status: "In Transit", changedBy: agentBobId, changedByName: "Agent Bob (Demo)", timestamp: new Date(Date.now() - 3600000), isDemo: true, sessionId });

    // Order 2: Pending Assignment (Unassigned)
    const order2 = await Order.create({
      customerId: demoCustomerId,
      pickupAddress: "123 North Ave",
      pickupPincode: "110001",
      pickupZoneId: zoneNorth._id,
      dropAddress: "999 West Bypass",
      dropPincode: "330003",
      dropZoneId: zoneWest._id,
      dimensions: { l: 30, b: 30, h: 30 }, // Volumetric: 5.4kg
      actualWeight: 2,
      volumetricWeight: 5.4,
      billedWeight: 5.4,
      orderType: "B2C",
      paymentType: "COD",
      charge: 169.8, // base 90 + 5.4*12 + 15
      status: "Pending",
      isDemo: true,
      sessionId,
    });

    await OrderStatusHistory.create({ orderId: order2._id, status: "Pending", changedBy: demoCustomerId, changedByName: "Demo Customer", isDemo: true, sessionId });

    // Order 3: Failed (Agent Alice)
    const order3 = await Order.create({
      customerId: demoCustomerId,
      agentId: agentAliceId,
      pickupAddress: "404 North Blvd",
      pickupPincode: "110001",
      pickupZoneId: zoneNorth._id,
      dropAddress: "505 North St",
      dropPincode: "110001",
      dropZoneId: zoneNorth._id,
      dimensions: { l: 10, b: 10, h: 10 },
      actualWeight: 0.5,
      volumetricWeight: 0.2,
      billedWeight: 0.5,
      orderType: "B2C",
      paymentType: "Prepaid",
      charge: 42.5, // base 40 + 0.5*5
      status: "Failed",
      failedReason: "Recipient not available at address after multiple bell rings.",
      isDemo: true,
      sessionId,
    });

    await OrderStatusHistory.create({ orderId: order3._id, status: "Pending", changedBy: demoCustomerId, changedByName: "Demo Customer", timestamp: new Date(Date.now() - 3600000 * 4), isDemo: true, sessionId });
    await OrderStatusHistory.create({ orderId: order3._id, status: "Picked Up", changedBy: agentAliceId, changedByName: "Agent Alice (Demo)", timestamp: new Date(Date.now() - 3600000 * 3), isDemo: true, sessionId });
    await OrderStatusHistory.create({ orderId: order3._id, status: "In Transit", changedBy: agentAliceId, changedByName: "Agent Alice (Demo)", timestamp: new Date(Date.now() - 3600000 * 2), isDemo: true, sessionId });
    await OrderStatusHistory.create({ orderId: order3._id, status: "Out for Delivery", changedBy: agentAliceId, changedByName: "Agent Alice (Demo)", timestamp: new Date(Date.now() - 3600000), isDemo: true, sessionId });
    await OrderStatusHistory.create({ orderId: order3._id, status: "Failed", changedBy: agentAliceId, changedByName: "Agent Alice (Demo)", timestamp: new Date(), isDemo: true, sessionId });

    // Order 4: Delivered (Agent Alice)
    const order4 = await Order.create({
      customerId: demoCustomerId,
      agentId: agentAliceId,
      pickupAddress: "123 North Ave",
      pickupPincode: "110001",
      pickupZoneId: zoneNorth._id,
      dropAddress: "808 North St",
      dropPincode: "110001",
      dropZoneId: zoneNorth._id,
      dimensions: { l: 15, b: 15, h: 15 },
      actualWeight: 1,
      volumetricWeight: 0.68,
      billedWeight: 1,
      orderType: "B2C",
      paymentType: "Prepaid",
      charge: 45.0, // base 40 + 1*5
      status: "Delivered",
      isDemo: true,
      sessionId,
    });

    await OrderStatusHistory.create({ orderId: order4._id, status: "Pending", changedBy: demoCustomerId, changedByName: "Demo Customer", timestamp: new Date(Date.now() - 3600000 * 5), isDemo: true, sessionId });
    await OrderStatusHistory.create({ orderId: order4._id, status: "Picked Up", changedBy: agentAliceId, changedByName: "Agent Alice (Demo)", timestamp: new Date(Date.now() - 3600000 * 4), isDemo: true, sessionId });
    await OrderStatusHistory.create({ orderId: order4._id, status: "In Transit", changedBy: agentAliceId, changedByName: "Agent Alice (Demo)", timestamp: new Date(Date.now() - 3600000 * 3), isDemo: true, sessionId });
    await OrderStatusHistory.create({ orderId: order4._id, status: "Out for Delivery", changedBy: agentAliceId, changedByName: "Agent Alice (Demo)", timestamp: new Date(Date.now() - 3600000 * 2), isDemo: true, sessionId });
    await OrderStatusHistory.create({ orderId: order4._id, status: "Delivered", changedBy: agentAliceId, changedByName: "Agent Alice (Demo)", timestamp: new Date(Date.now() - 3600000), isDemo: true, sessionId });

    // 4. Save Demo Auth cookie
    cookieStore.set(
      "demo_session",
      JSON.stringify({ role, sessionId }),
      {
        path: "/",
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 1800, // 30 minutes
      }
    );

    return NextResponse.json({
      success: true,
      role,
      sessionId,
      redirectUrl: role === "admin" ? "/admin" : role === "agent" ? "/agent" : "/customer",
    });
  } catch (error: unknown) {
    console.error("POST /api/demo/seed error:", error);
    return NextResponse.json({ error: getErrorMessage(error, "Failed to seed demo sandbox") }, { status: 500 });
  }
}
