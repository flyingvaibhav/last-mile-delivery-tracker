import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { DemoNotification } from "@/lib/models/DemoNotification";
import { getAuthContext } from "@/lib/auth-helper";
import { getErrorMessage } from "@/types";

// GET /api/demo/notifications - Retrieve mock notifications logged during demo sessions
export async function GET() {
  try {
    const { isDemo, sessionId } = await getAuthContext();
    if (!isDemo || !sessionId) {
      return NextResponse.json([]); // Return empty list if not in demo mode
    }

    await connectToDatabase();
    const logs = await DemoNotification.find({ sessionId }).sort({ timestamp: -1 });
    return NextResponse.json(logs);
  } catch (error: unknown) {
    console.error("GET /api/demo/notifications error:", error);
    return NextResponse.json({ error: getErrorMessage(error, "Server Error") }, { status: 500 });
  }
}

// DELETE /api/demo/notifications - Clear notifications log for the active session
export async function DELETE() {
  try {
    const { isDemo, sessionId } = await getAuthContext();
    if (!isDemo || !sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    await DemoNotification.deleteMany({ sessionId });
    return NextResponse.json({ success: true, message: "Notifications log cleared" });
  } catch (error: unknown) {
    console.error("DELETE /api/demo/notifications error:", error);
    return NextResponse.json({ error: getErrorMessage(error, "Server Error") }, { status: 500 });
  }
}
