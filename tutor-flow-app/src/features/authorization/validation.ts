import type { TutorFlowUser, UserStatus } from "@/src/features/auth/types";
import type {
  Center,
  CenterMembership,
  CenterMembershipRole,
  CenterMembershipStatus,
  CenterStatus,
  Entitlement,
  EntitlementPlan,
  EntitlementStatus,
} from "@/src/features/authorization/types";
import type { Language, Tutor } from "@/src/types";

const userStatuses = ["ACTIVE", "SUSPENDED", "DISABLED"] satisfies UserStatus[];
const centerStatuses = ["ACTIVE", "SUSPENDED", "DISABLED"] satisfies CenterStatus[];
const membershipRoles = ["OWNER", "ADMIN", "TUTOR", "STAFF"] satisfies CenterMembershipRole[];
const membershipStatuses = ["ACTIVE", "INACTIVE"] satisfies CenterMembershipStatus[];
const entitlementPlans = ["STANDARD", "PRO"] satisfies EntitlementPlan[];
const entitlementStatuses = [
  "TRIAL",
  "ACTIVE",
  "EXPIRED",
  "CANCELLED",
  "SUSPENDED",
] satisfies EntitlementStatus[];
const languages = ["en", "ms"] satisfies Language[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}

function isOneOf<T extends string>(value: unknown, choices: readonly T[]): value is T {
  return typeof value === "string" && choices.some((choice) => choice === value);
}

export function isTutorFlowUser(value: unknown): value is TutorFlowUser {
  return isRecord(value)
    && isNonEmptyString(value.userId)
    && isNonEmptyString(value.googleSubject)
    && isNonEmptyString(value.email)
    && isNonEmptyString(value.name)
    && isOneOf(value.status, userStatuses)
    && isTimestamp(value.createdAt)
    && isTimestamp(value.updatedAt);
}

export function isTutor(value: unknown): value is Tutor {
  return isRecord(value)
    && isNonEmptyString(value.id)
    && isNonEmptyString(value.centerId)
    && isNonEmptyString(value.name)
    && isNonEmptyString(value.email)
    && (value.businessName === undefined || typeof value.businessName === "string")
    && (value.phone === undefined || typeof value.phone === "string")
    && isOneOf(value.defaultLanguage, languages)
    && isTimestamp(value.createdAt);
}

export function isCenter(value: unknown): value is Center {
  return isRecord(value)
    && isNonEmptyString(value.centerId)
    && isNonEmptyString(value.name)
    && isOneOf(value.status, centerStatuses)
    && isTimestamp(value.createdAt)
    && isTimestamp(value.updatedAt);
}

export function isCenterMembership(value: unknown): value is CenterMembership {
  return isRecord(value)
    && isNonEmptyString(value.membershipId)
    && isNonEmptyString(value.userId)
    && isNonEmptyString(value.centerId)
    && isOneOf(value.role, membershipRoles)
    && (
      value.role === "TUTOR"
        ? isNonEmptyString(value.tutorId)
        : value.tutorId === null || isNonEmptyString(value.tutorId)
    )
    && isOneOf(value.status, membershipStatuses)
    && isTimestamp(value.createdAt)
    && isTimestamp(value.updatedAt);
}

export function isMembershipTutorInSameCenter(
  membership: CenterMembership,
  tutor: Tutor | null,
): boolean {
  if (membership.tutorId === null) return membership.role !== "TUTOR";
  return Boolean(
    tutor
    && tutor.id === membership.tutorId
    && tutor.centerId === membership.centerId,
  );
}

export function isEntitlement(value: unknown): value is Entitlement {
  return isRecord(value)
    && isNonEmptyString(value.entitlementId)
    && isNonEmptyString(value.centerId)
    && isOneOf(value.plan, entitlementPlans)
    && isOneOf(value.status, entitlementStatuses)
    && isTimestamp(value.startsAt)
    && isTimestamp(value.expiresAt)
    && new Date(value.expiresAt).getTime() > new Date(value.startsAt).getTime()
    && (value.purchaseReference === null || typeof value.purchaseReference === "string")
    && isTimestamp(value.createdAt)
    && isTimestamp(value.updatedAt);
}
