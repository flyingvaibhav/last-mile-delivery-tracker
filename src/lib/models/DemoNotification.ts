import mongoose, { Schema, Document } from "mongoose";

export interface IDemoNotification extends Document {
  sessionId: string;
  to: string;
  subject: string;
  body: string;
  timestamp: Date;
}

const DemoNotificationSchema = new Schema<IDemoNotification>(
  {
    sessionId: { type: String, required: true, index: true },
    to: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    timestamp: { type: Date, default: Date.now, required: true },
  },
  { timestamps: false }
);

export const DemoNotification =
  mongoose.models.DemoNotification ||
  mongoose.model<IDemoNotification>("DemoNotification", DemoNotificationSchema);
