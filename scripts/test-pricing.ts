// Set environment variable BEFORE importing db
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/last_mile_delivery_test";

import { connectToDatabase } from "../src/lib/db";
import { Zone } from "../src/lib/models/Zone";
import { Area } from "../src/lib/models/Area";
import { RateCard } from "../src/lib/models/RateCard";
import { CODSurcharge } from "../src/lib/models/CODSurcharge";
import { calculateOrderCharge } from "../src/lib/pricing";

async function runTest() {
  console.log("Connecting to test database at", process.env.MONGODB_URI);
  await connectToDatabase();

  await Zone.deleteMany({});
  await Area.deleteMany({});
  await RateCard.deleteMany({});
  await CODSurcharge.deleteMany({});

  console.log("Seeding test data...");

  const zoneA = await Zone.create({ name: "Zone A (North)" });
  const zoneB = await Zone.create({ name: "Zone B (West)" });

  await Area.create({ zoneId: zoneA._id, pincodeOrName: "110001" });
  await Area.create({ zoneId: zoneA._id, pincodeOrName: "110002" });
  await Area.create({ zoneId: zoneB._id, pincodeOrName: "400001" });

  await RateCard.create({
    orderType: "B2C",
    zoneFrom: zoneA._id,
    zoneTo: zoneA._id,
    baseCharge: 50,
    ratePerKg: 10,
  });

  await RateCard.create({
    orderType: "B2C",
    zoneFrom: zoneA._id,
    zoneTo: zoneB._id,
    baseCharge: 100,
    ratePerKg: 20,
  });

  await CODSurcharge.create({
    orderType: "B2C",
    surchargeAmount: 25,
  });

  console.log("Running pricing tests...");

  const test1 = await calculateOrderCharge({
    pickupPincode: "110001",
    dropPincode: "110002",
    l: 10,
    b: 10,
    h: 10,
    actualWeight: 2,
    orderType: "B2C",
    paymentType: "Prepaid",
  });
  console.assert(test1.charge === 70, `Test 1 failed. Expected 70, got ${test1.charge}`);
  console.assert(test1.billedWeight === 2, `Test 1 billed weight failed. Expected 2, got ${test1.billedWeight}`);
  console.log("✓ Test Case 1 passed:", test1);

  const test2 = await calculateOrderCharge({
    pickupPincode: "110001",
    dropPincode: "400001",
    l: 30,
    b: 30,
    h: 30,
    actualWeight: 2,
    orderType: "B2C",
    paymentType: "COD",
  });
  console.assert(test2.charge === 233, `Test 2 failed. Expected 233, got ${test2.charge}`);
  console.assert(test2.billedWeight === 5.4, `Test 2 billed weight failed. Expected 5.4, got ${test2.billedWeight}`);
  console.log("✓ Test Case 2 passed:", test2);

  console.log("All pricing engine checks passed successfully!");
  process.exit(0);
}

runTest().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
