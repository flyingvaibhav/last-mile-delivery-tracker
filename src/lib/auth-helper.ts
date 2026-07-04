import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { getRoleFromMetadata, type UserRole } from "@/types";

export interface AuthContext {
  userId: string;
  role: UserRole;
  isDemo: boolean;
  sessionId: string | null;
}

export async function getAuthContext(): Promise<AuthContext> {
  try {
    // 1. Try to read Clerk session first
    const { userId, sessionClaims } = await auth();

    if (userId) {
      const role = getRoleFromMetadata(sessionClaims?.metadata);
      return {
        userId,
        role,
        isDemo: false,
        sessionId: null,
      };
    }
  } catch {
    // clerk auth may fail if called in non-auth contexts, swallow and fallback to demo cookies
  }

  // 2. Fallback: Check if demo session cookie exists
  try {
    const cookieStore = await cookies();
    const demoCookie = cookieStore.get("demo_session")?.value;

    if (demoCookie) {
      const sessionData = JSON.parse(demoCookie);
      const { role, sessionId } = sessionData;

      if (role && sessionId) {
        return {
          userId: `demo-${role}-${sessionId}`,
          role: role as UserRole,
          isDemo: true,
          sessionId,
        };
      }
    }
  } catch {
    // Ignore JSON parsing or cookie store errors
  }

  // Return empty context if not logged in and not in demo mode
  return {
    userId: "",
    role: "customer",
    isDemo: false,
    sessionId: null,
  };
}
