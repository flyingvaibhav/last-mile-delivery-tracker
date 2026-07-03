import mongoose, { Schema, Document } from "mongoose";

export interface ICODSurcharge extends Document {
  orderType: "B2B" | "B2C";
  surchargeAmount: number;
  isDemo?: boolean;
  sessionId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const CODSurchargeSchema = new Schema<ICODSurcharge>(
  {
    orderType: { type: String, enum: ["B2B", "B2C"], required: true, unique: true },
    surchargeAmount: { type: Number, required: true, default: 0 },
    isDemo: { type: Boolean, default: false },
    sessionId: { type: String, default: null },
  },
  { timestamps: true }
);

export const CODSurcharge = mongoose.models.CODSurcharge || mongoose.model<ICODSurcharge>("CODSurcharge", CODSurchargeSchema);
