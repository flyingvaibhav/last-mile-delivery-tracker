export type UserRole = "customer" | "agent" | "admin";
export type OrderType = "B2B" | "B2C";
export type PaymentType = "Prepaid" | "COD";
export type VehicleType = "2-Wheeler" | "Three-Wheeler" | "Tata Ace" | "Pickup";

export interface ClerkPublicMetadata {
  role?: UserRole;
}

export function getRoleFromMetadata(metadata: unknown): UserRole {
  const meta = metadata as ClerkPublicMetadata | undefined;
  const role = meta?.role;
  if (role === "customer" || role === "agent" || role === "admin") {
    return role;
  }
  return "customer";
}

export function getErrorMessage(error: unknown, fallback = "An unexpected error occurred"): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return fallback;
}
