import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent, UserJSON } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/lib/models/User";
import { Agent } from "@/lib/models/Agent";
import { getRoleFromMetadata } from "@/types";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    return new Response("Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local", {
      status: 500,
    });
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occurred -- no svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occurred during signature verification", {
      status: 400,
    });
  }

  // Handle the webhook event
  const { id } = evt.data;
  const eventType = evt.type;

  await connectToDatabase();

  if (eventType === "user.created" || eventType === "user.updated") {
    const data = evt.data as UserJSON;
    const email = data.email_addresses?.[0]?.email_address || "";
    const phone = data.phone_numbers?.[0]?.phone_number || "";
    const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || email.split("@")[0];

    const role = getRoleFromMetadata(data.public_metadata);

    // Upsert the user mirrored document
    await User.findOneAndUpdate(
      { clerkId: id },
      {
        name,
        email,
        phone,
        role,
      },
      { upsert: true, new: true }
    );

    // If role is agent, ensure the corresponding Agent document exists
    if (role === "agent") {
      await Agent.findOneAndUpdate(
        { clerkId: id },
        { $setOnInsert: { availabilityStatus: "available" } },
        { upsert: true }
      );
    } else {
      // If demoted from agent, remove their Agent metadata record
      await Agent.deleteOne({ clerkId: id });
    }

    console.log(`[Webhook Sync] Synced Clerk user ${id} (${email}) as role: ${role}`);
  }

  if (eventType === "user.deleted") {
    await User.deleteOne({ clerkId: id });
    await Agent.deleteOne({ clerkId: id });
    console.log(`[Webhook Sync] Deleted user ${id}`);
  }

  return new Response("Webhook processed successfully", { status: 200 });
}
