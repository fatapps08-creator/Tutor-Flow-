import type { UserStatus } from "@/src/features/auth/types";

export type CenterStatus = UserStatus;

export type Center = {
  centerId: string;
  name: string;
  status: CenterStatus;
  createdAt: string;
  updatedAt: string;
};

export type CenterMembershipRole = "OWNER" | "ADMIN" | "TUTOR" | "STAFF";
export type CenterMembershipStatus = "ACTIVE" | "INACTIVE";

export type CenterMembership = {
  membershipId: string;
  userId: string;
  centerId: string;
  role: CenterMembershipRole;
  tutorId: string | null;
  status: CenterMembershipStatus;
  createdAt: string;
  updatedAt: string;
};

export type EntitlementPlan = "STANDARD" | "PRO";
export type EntitlementStatus =
  | "TRIAL"
  | "ACTIVE"
  | "EXPIRED"
  | "CANCELLED"
  | "SUSPENDED";

export type Entitlement = {
  entitlementId: string;
  centerId: string;
  plan: EntitlementPlan;
  status: EntitlementStatus;
  startsAt: string;
  expiresAt: string;
  purchaseReference: string | null;
  createdAt: string;
  updatedAt: string;
};
