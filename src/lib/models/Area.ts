import mongoose, { Schema, Document } from "mongoose";

export interface IArea extends Document {
  zoneId: mongoose.Types.ObjectId;
  pincodeOrName: string;
  isDemo?: boolean;
  sessionId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const AreaSchema = new Schema<IArea>(
  {
    zoneId: { type: Schema.Types.ObjectId, ref: "Zone", required: true },
    pincodeOrName: { type: String, required: true, unique: true, index: true },
    isDemo: { type: Boolean, default: false, index: true },
    sessionId: { type: String, default: null, index: true },
  },
  { timestamps: true }
);

export const Area = mongoose.models.Area || mongoose.model<IArea>("Area", AreaSchema);
