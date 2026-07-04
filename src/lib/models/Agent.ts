import mongoose, { Schema, Document } from "mongoose";

export interface IAgent extends Document {
  clerkId: string; // Clerk ID
  currentZoneId?: mongoose.Types.ObjectId; // Reference to Zone
  availabilityStatus: "available" | "busy" | "offline";
  isDemo?: boolean;
  sessionId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const AgentSchema = new Schema<IAgent>(
  {
    clerkId: { type: String, required: true, unique: true, index: true },
    currentZoneId: { type: Schema.Types.ObjectId, ref: "Zone" },
    availabilityStatus: {
      type: String,
      enum: ["available", "busy", "offline"],
      default: "available",
      required: true,
      index: true,
    },
    isDemo: { type: Boolean, default: false, index: true },
    sessionId: { type: String, default: null, index: true },
  },
  { timestamps: true }
);

export const Agent = mongoose.models.Agent || mongoose.model<IAgent>("Agent", AgentSchema);
