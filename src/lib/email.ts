import nodemailer from "nodemailer";
import { connectToDatabase } from "./db";
import { DemoNotification } from "./models/DemoNotification";

interface EmailParams {
  orderId: string;
  customerEmail: string;
  customerName: string;
  status: string;
  pickupAddress: string;
  dropAddress: string;
  charge: number;
  failedReason?: string;
  rescheduledDate?: Date;
  isDemo?: boolean;
  sessionId?: string | null;
}

export async function sendStatusUpdateEmail(params: EmailParams) {
  const {
    orderId,
    customerEmail,
    customerName,
    status,
    pickupAddress,
    dropAddress,
    charge,
    failedReason,
    rescheduledDate,
    isDemo = false,
    sessionId = null,
  } = params;

  let statusColor = "#3b82f6"; // default blue
  let statusText = status;
  let extraDetails = "";

  if (status === "Pending") {
    statusColor = "#f59e0b"; // amber
    statusText = "Pending Assignment";
  } else if (status === "Picked Up") {
    statusColor = "#6366f1"; // indigo
    statusText = "Picked Up";
  } else if (status === "In Transit") {
    statusColor = "#06b6d4"; // cyan
  } else if (status === "Out for Delivery") {
    statusColor = "#8b5cf6"; // purple
  } else if (status === "Delivered") {
    statusColor = "#10b981"; // emerald
    statusText = "Delivered Successfully";
  } else if (status === "Failed") {
    statusColor = "#ef4444"; // red
    statusText = "Delivery Attempt Failed";
    extraDetails = `
      <div style="background-color: #fef2f2; border: 1px solid #fee2e2; padding: 12px; border-radius: 6px; margin-top: 15px;">
        <h4 style="color: #991b1b; margin: 0 0 5px 0;">Reason for Failure</h4>
        <p style="color: #7f1d1d; margin: 0; font-size: 14px;">${failedReason || "No reason provided by the agent."}</p>
        <p style="color: #7f1d1d; margin: 10px 0 0 0; font-size: 13px; font-style: italic;">
          Please log into your dashboard to reschedule this delivery for a new date.
        </p>
      </div>
    `;
  }

  if (rescheduledDate) {
    extraDetails += `
      <div style="background-color: #f0fdf4; border: 1px solid #dcfce7; padding: 12px; border-radius: 6px; margin-top: 15px;">
        <h4 style="color: #166534; margin: 0 0 5px 0;">Rescheduled Delivery Date</h4>
        <p style="color: #14532d; margin: 0; font-size: 14px;">${new Date(rescheduledDate).toLocaleDateString(
          "en-US",
          { weekday: "long", year: "numeric", month: "long", day: "numeric" }
        )}</p>
      </div>
    `;
  }

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      <!-- Header -->
      <div style="background-color: #0b0f19; padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em;">Last-Mile Delivery Tracker</h1>
      </div>
      
      <!-- Content -->
      <div style="padding: 24px; background-color: #ffffff; color: #1f2937;">
        <h2 style="font-size: 18px; margin-top: 0;">Hello ${customerName},</h2>
        <p style="font-size: 15px; line-height: 1.5; color: #4b5563;">Your order status has been updated. Here are the latest details for your shipment.</p>
        
        <!-- Status Banner -->
        <div style="display: inline-block; background-color: ${statusColor}; color: white; padding: 8px 16px; border-radius: 9999px; font-weight: 600; font-size: 14px; margin-bottom: 20px;">
          ${statusText.toUpperCase()}
        </div>
        
        <!-- Order Summary Card -->
        <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
          <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 10px;">Shipment Summary</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 4px 0; color: #6b7280; width: 35%;">Order ID:</td>
              <td style="padding: 4px 0; font-family: monospace; font-weight: bold; color: #111827;">${orderId}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #6b7280;">Pickup Address:</td>
              <td style="padding: 4px 0; color: #111827;">${pickupAddress}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #6b7280;">Drop Address:</td>
              <td style="padding: 4px 0; color: #111827;">${dropAddress}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #6b7280;">Total Paid/COD:</td>
              <td style="padding: 4px 0; color: #111827; font-weight: bold;">$${charge.toFixed(2)}</td>
            </tr>
          </table>
        </div>

        ${extraDetails}
        
        <div style="margin-top: 24px; text-align: center;">
          <a href="${
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
          }/customer" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">Track Order in Dashboard</a>
        </div>
      </div>

      <!-- Footer -->
      <div style="background-color: #f3f4f6; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
        <p style="margin: 0;">This is an automated delivery update. Please do not reply directly to this email.</p>
        <p style="margin: 4px 0 0 0;">&copy; 2026 Last-Mile Delivery Inc. All rights reserved.</p>
      </div>
    </div>
  `;

  // 1. If in Demo Mode, bypass real SMTP and store email log in database instead
  if (isDemo && sessionId) {
    console.log(`[Demo Email Log] Storing simulated email in database for session: ${sessionId}`);
    await connectToDatabase();
    await DemoNotification.create({
      sessionId,
      to: customerEmail,
      subject: `[Update] Order #${orderId.substring(orderId.length - 6).toUpperCase()} is now ${statusText}`,
      body: htmlContent,
    });
    return;
  }

  // 2. Production SMTP Flow
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    console.warn("[Email Notification] SMTP is not fully configured in environment. Skipping email sending.");
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: SMTP_FROM || `"Delivery Tracker" <${SMTP_USER}>`,
      to: customerEmail,
      subject: `[Update] Order #${orderId.substring(orderId.length - 6).toUpperCase()} is now ${statusText}`,
      html: htmlContent,
    });

    console.log(`[Email Sent] Status "${status}" email successfully sent to ${customerEmail} for order ${orderId}`);
  } catch (error) {
    console.error("[Email Notification Error] Failed to send email via SMTP:", error);
  }
}

// Non-blocking trigger wrapper
export function triggerStatusUpdateEmail(params: EmailParams) {
  sendStatusUpdateEmail(params).catch((err) => {
    console.error("[Email Async Error] Fail in sendStatusUpdateEmail background promise:", err);
  });
}

interface SMSParams {
  orderId: string;
  customerPhone: string;
  customerName: string;
  status: string;
  charge: number;
  failedReason?: string;
  isDemo?: boolean;
  sessionId?: string | null;
}

export async function sendStatusUpdateSMS(params: SMSParams) {
  const {
    orderId,
    customerPhone,
    customerName,
    status,
    charge,
    failedReason,
    isDemo = false,
    sessionId = null,
  } = params;

  if (!customerPhone) {
    console.log("[SMS Notification] Skipping because customer has no phone number configured.");
    return;
  }

  const shortOrderId = orderId.substring(orderId.length - 6).toUpperCase();
  let smsContent = `Hi ${customerName}, your Order #${shortOrderId} status is now: ${status.toUpperCase()}.`;
  if (status === "Failed") {
    smsContent += ` Reason: ${failedReason || "No details provided"}. Please reschedule in your dashboard.`;
  } else if (status === "Pending") {
    smsContent += ` Total Charge: $${charge.toFixed(2)}.`;
  }

  // 1. If in Demo Mode, bypass real SMS and store SMS log in database instead
  if (isDemo && sessionId) {
    console.log(`[Demo SMS Log] Storing simulated SMS in database for session: ${sessionId}`);
    await connectToDatabase();
    await DemoNotification.create({
      sessionId,
      to: customerPhone,
      subject: `[SMS Alert] Order #${shortOrderId} is now ${status}`,
      body: `<div style="padding: 12px; background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 6px; font-family: monospace; font-size: 13px; color: #92400e; margin-top: 10px;">
              <span style="font-weight: bold; color: #b45309; display: block; margin-bottom: 4px;">📟 TO: ${customerPhone} (SMS ALERT)</span>
              ${smsContent}
             </div>`,
    });
    return;
  }

  // 2. Production SMS Flow
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    console.warn(`[SMS Notification] Twilio is not configured. Console log: "${smsContent}" to recipient ${customerPhone}`);
    return;
  }

  try {
    // Dynamic eval require to prevent Turbopack compilation resolution warning
    const twilio = eval("require")("twilio");
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    await client.messages.create({
      body: smsContent,
      from: TWILIO_FROM_NUMBER,
      to: customerPhone,
    });
    console.log(`[SMS Sent] Status "${status}" SMS successfully sent to ${customerPhone} for order ${orderId}`);
  } catch (error) {
    console.error("[SMS Notification Error] Failed to send SMS via Twilio:", error);
  }
}

export function triggerStatusUpdateSMS(params: SMSParams) {
  sendStatusUpdateSMS(params).catch((err) => {
    console.error("[SMS Async Error] Fail in sendStatusUpdateSMS background promise:", err);
  });
}

