import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";
import { getRoleFromMetadata } from "@/types";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isAgentRoute = createRouteMatcher(["/agent(.*)"]);
const isCustomerRoute = createRouteMatcher(["/customer(.*)"]);

const clerkHandler = clerkMiddleware(async (auth, req) => {
  // 1. Check for active Demo Session cookie bypass first
  const demoCookie = req.cookies.get("demo_session")?.value;
  if (demoCookie) {
    try {
      const sessionData = JSON.parse(demoCookie);
      const { role } = sessionData;

      if (role && ["customer", "agent", "admin"].includes(role)) {
        // Enforce role-based routing gates for demo users
        if (isAdminRoute(req) && role !== "admin") {
          return NextResponse.redirect(new URL("/", req.url));
        }
        if (isAgentRoute(req) && role !== "agent") {
          return NextResponse.redirect(new URL("/", req.url));
        }
        if (isCustomerRoute(req) && role !== "customer") {
          return NextResponse.redirect(new URL("/", req.url));
        }
        return NextResponse.next();
      }
    } catch {
      // Invalid cookie, let standard Clerk auth handle the request
    }
  }

  // 2. Production Clerk Auth Check
  const { userId, sessionClaims } = await auth();

  const isPublicRoute = createRouteMatcher([
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/api/clerk/webhook(.*)",
    "/api/demo/seed(.*)", // Allow seeding endpoints to be accessed publicly
  ]);

  // Force authentication on all non-public routes
  if (!userId) {
    if (!isPublicRoute(req)) {
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("redirect_url", req.url);
      return NextResponse.redirect(signInUrl);
    }
    return NextResponse.next();
  }

  // Retrieve user role from custom Claims metadata
  const role = getRoleFromMetadata(sessionClaims?.metadata);

  // Enforce role-based routing gates for production users
  if (isAdminRoute(req) && role !== "admin") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (isAgentRoute(req) && role !== "agent") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (isCustomerRoute(req) && role !== "customer") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export function proxy(req: NextRequest, event: NextFetchEvent) {
  return clerkHandler(req, event);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html|css|js(?!on)|jpeg|jpg|png|gif|svg|ttf|woff2?|ico|csv|docx|xlsx|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
