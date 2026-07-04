import { connectToDatabase } from "./db";
import { Area } from "./models/Area";
import { RateCard } from "./models/RateCard";
import { CODSurcharge } from "./models/CODSurcharge";
import type { QueryFilter } from "mongoose";
import type { IArea } from "./models/Area";
import type { IRateCard } from "./models/RateCard";

export function calculateVolumetricWeight(l: number, b: number, h: number): number {
  if (l <= 0 || b <= 0 || h <= 0) return 0;
  // Volumetric weight = (L * B * H) / 5000
  return Number(((l * b * h) / 5000).toFixed(2));
}

export async function findZoneForPincode(pincode: string, isDemo = false, sessionId: string | null = null) {
  await connectToDatabase();
  const cleanPincode = pincode.trim();
  
  // Build query scoped to demo or production environment
  const query: QueryFilter<IArea> = {};
  if (isDemo && sessionId) {
    const suffix = sessionId.substring(5, 11);
    query.pincodeOrName = `${cleanPincode}-${suffix}`;
    query.isDemo = true;
    query.sessionId = sessionId;
  } else {
    query.pincodeOrName = cleanPincode;
    query.$or = [{ isDemo: false }, { isDemo: { $exists: false } }];
  }

  let area = await Area.findOne(query).populate("zoneId");

  // GUEST FALLBACK: If not found, try to locate any demo zone matching the prefix
  if (!area) {
    area = await Area.findOne({
      pincodeOrName: { $regex: `^${cleanPincode}` }
    }).populate("zoneId");
  }

  if (!area) {
    throw new Error(`Pincode/Area "${cleanPincode}" is not mapped to any shipping zone.`);
  }
  return area.zoneId as unknown as { _id: string; name: string; isDemo?: boolean; sessionId?: string };
}

interface PricingParams {
  pickupPincode: string;
  dropPincode: string;
  l: number;
  b: number;
  h: number;
  actualWeight: number;
  orderType: "B2B" | "B2C";
  paymentType: "Prepaid" | "COD";
  vehicleType?: "2-Wheeler" | "Three-Wheeler" | "Tata Ace" | "Pickup";
  isDemo?: boolean;
  sessionId?: string | null;
}

export async function calculateOrderCharge(params: PricingParams) {
  const {
    pickupPincode,
    dropPincode,
    l,
    b,
    h,
    actualWeight,
    orderType,
    paymentType,
    vehicleType = "2-Wheeler",
    isDemo = false,
    sessionId = null,
  } = params;

  await connectToDatabase();

  // 1. Resolve pickup and drop zones using environment context
  const pickupZone = await findZoneForPincode(pickupPincode, isDemo, sessionId);
  const dropZone = await findZoneForPincode(dropPincode, isDemo, sessionId);

  if (!pickupZone || !dropZone) {
    throw new Error("Unable to resolve pickup or drop zone.");
  }

  // 2. Weight Calculations
  const volumetricWeight = calculateVolumetricWeight(l, b, h);
  const billedWeight = Math.max(actualWeight, volumetricWeight);

  // 3. Determine if intra-zone or inter-zone
  const isIntraZone = pickupZone._id.toString() === dropZone._id.toString();

  // 4. Fetch the rate card
  const rateQuery: QueryFilter<IRateCard> = {
    orderType,
    zoneFrom: pickupZone._id,
    zoneTo: dropZone._id,
  };
  
  const targetSessionId = sessionId || pickupZone.sessionId;
  const isTargetDemo = isDemo || pickupZone.isDemo;

  if (isTargetDemo && targetSessionId) {
    rateQuery.isDemo = true;
    rateQuery.sessionId = targetSessionId;
  } else {
    rateQuery.$or = [{ isDemo: false }, { isDemo: { $exists: false } }];
  }

  let rateCard = await RateCard.findOne(rateQuery);

  if (!rateCard) {
    // Fallback: search for any rate card for these zone IDs
    rateCard = await RateCard.findOne({
      orderType,
      zoneFrom: pickupZone._id,
      zoneTo: dropZone._id,
    });
  }

  if (!rateCard) {
    throw new Error(
      `No rate card configured for ${orderType} shipments from zone "${pickupZone.name}" to zone "${dropZone.name}".`
    );
  }

  // 5. Apply Vehicle Multiplier
  const vehicleMultipliers = {
    "2-Wheeler": 1.0,
    "Three-Wheeler": 1.5,
    "Tata Ace": 2.5,
    "Pickup": 4.0,
  };
  const multiplier = vehicleMultipliers[vehicleType] || 1.0;

  // Calculate charge = (baseCharge + (billedWeight * ratePerKg)) * multiplier
  const baseCharge = rateCard.baseCharge;
  const ratePerKg = rateCard.ratePerKg;
  let charge = (baseCharge + billedWeight * ratePerKg) * multiplier;

  // 6. Add COD Surcharge if payment is COD
  let codSurcharge = 0;
  if (paymentType === "COD") {
    // Query surcharge globally as it is restricted by a global unique index in MongoDB schema
    const surcharge = await CODSurcharge.findOne({ orderType });
    if (surcharge) {
      codSurcharge = surcharge.surchargeAmount;
      charge += codSurcharge;
    }
  }

  // Round charge to 2 decimal places
  charge = Number(charge.toFixed(2));

  return {
    pickupZone,
    dropZone,
    volumetricWeight,
    billedWeight,
    baseCharge,
    ratePerKg,
    codSurcharge,
    isIntraZone,
    multiplier,
    charge,
  };
}
