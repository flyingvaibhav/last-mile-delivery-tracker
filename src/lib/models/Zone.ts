import mongoose, { Schema, Document } from "mongoose";

export interface IZone extends Document {
  name: string;
  isDemo?: boolean;
  sessionId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ZoneSchema = new Schema<IZone>(
  {
    name: { type: String, required: true, unique: true, index: true },
    isDemo: { type: Boolean, default: false, index: true },
    sessionId: { type: String, default: null, index: true },
  },
  { timestamps: true }
);

export const Zone = mongoose.models.Zone || mongoose.model<IZone>("Zone", ZoneSchema);
