import mongoose, { Schema, Document } from "mongoose";

export interface IOrderStatusHistory extends Document {
  orderId: mongoose.Types.ObjectId;
  status: string;
  changedBy: string; // Clerk ID of actor
  changedByName: string; // Name of actor (e.g. "John Doe" or "System Auto-Assign")
  timestamp: Date;
  isDemo?: boolean;
  sessionId?: string | null;
}

const OrderStatusHistorySchema = new Schema<IOrderStatusHistory>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    status: { type: String, required: true },
    changedBy: { type: String, required: true },
    changedByName: { type: String, required: true },
    timestamp: { type: Date, default: Date.now, required: true },
    isDemo: { type: Boolean, default: false, index: true },
    sessionId: { type: String, default: null, index: true },
  },
  { timestamps: false }
); // No standard timestamps, we use timestamp field

export const OrderStatusHistory =
  mongoose.models.OrderStatusHistory ||
  mongoose.model<IOrderStatusHistory>("OrderStatusHistory", OrderStatusHistorySchema);
