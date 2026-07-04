import mongoose, { Schema, Document } from "mongoose";

export interface IOrder extends Document {
  customerId: string; // Clerk ID
  agentId?: string; // Clerk ID of assigned agent
  pickupAddress: string;
  pickupPincode: string;
  pickupZoneId: mongoose.Types.ObjectId;
  dropAddress: string;
  dropPincode: string;
  dropZoneId: mongoose.Types.ObjectId;
  dimensions: {
    l: number;
    b: number;
    h: number;
  };
  actualWeight: number;
  volumetricWeight: number;
  billedWeight: number;
  orderType: "B2B" | "B2C";
  paymentType: "Prepaid" | "COD";
  charge: number;
  status: "Pending" | "Picked Up" | "In Transit" | "Out for Delivery" | "Delivered" | "Failed";
  failedReason?: string;
  rescheduledDate?: Date;
  isDemo?: boolean;
  sessionId?: string | null;
  senderName?: string;
  senderPhone?: string;
  recipientName?: string;
  recipientPhone?: string;
  vehicleType: "2-Wheeler" | "Three-Wheeler" | "Tata Ace" | "Pickup";
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    customerId: { type: String, required: true, index: true },
    agentId: { type: String, index: true },
    pickupAddress: { type: String, required: true },
    pickupPincode: { type: String, required: true },
    pickupZoneId: { type: Schema.Types.ObjectId, ref: "Zone", required: true },
    dropAddress: { type: String, required: true },
    dropPincode: { type: String, required: true },
    dropZoneId: { type: Schema.Types.ObjectId, ref: "Zone", required: true },
    dimensions: {
      l: { type: Number, required: true },
      b: { type: Number, required: true },
      h: { type: Number, required: true },
    },
    actualWeight: { type: Number, required: true },
    volumetricWeight: { type: Number, required: true },
    billedWeight: { type: Number, required: true },
    orderType: { type: String, enum: ["B2B", "B2C"], required: true },
    paymentType: { type: String, enum: ["Prepaid", "COD"], required: true },
    charge: { type: Number, required: true },
    senderName: { type: String },
    senderPhone: { type: String },
    recipientName: { type: String },
    recipientPhone: { type: String },
    vehicleType: {
      type: String,
      enum: ["2-Wheeler", "Three-Wheeler", "Tata Ace", "Pickup"],
      default: "2-Wheeler",
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Picked Up", "In Transit", "Out for Delivery", "Delivered", "Failed"],
      default: "Pending",
      required: true,
      index: true,
    },
    failedReason: { type: String },
    rescheduledDate: { type: Date },
    isDemo: { type: Boolean, default: false, index: true },
    sessionId: { type: String, default: null, index: true },
  },
  { timestamps: true }
);

export const Order = mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);
