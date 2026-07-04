import mongoose, { Schema, Document } from "mongoose";

export interface IRateCard extends Document {
  orderType: "B2B" | "B2C";
  zoneFrom: mongoose.Types.ObjectId;
  zoneTo: mongoose.Types.ObjectId;
  baseCharge: number;
  ratePerKg: number;
  isDemo?: boolean;
  sessionId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const RateCardSchema = new Schema<IRateCard>(
  {
    orderType: { type: String, enum: ["B2B", "B2C"], required: true },
    zoneFrom: { type: Schema.Types.ObjectId, ref: "Zone", required: true },
    zoneTo: { type: Schema.Types.ObjectId, ref: "Zone", required: true },
    baseCharge: { type: Number, required: true, default: 0 },
    ratePerKg: { type: Number, required: true, default: 0 },
    isDemo: { type: Boolean, default: false, index: true },
    sessionId: { type: String, default: null, index: true },
  },
  { timestamps: true }
);

// Compound index to ensure uniqueness of rate cards for a specific zone-to-zone pair and order type
RateCardSchema.index({ orderType: 1, zoneFrom: 1, zoneTo: 1 }, { unique: true });

export const RateCard = mongoose.models.RateCard || mongoose.model<IRateCard>("RateCard", RateCardSchema);
