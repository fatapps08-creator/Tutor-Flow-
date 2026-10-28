import "server-only";

import { requireAuthenticatedUser } from "@/src/features/auth/session";
import type { Center, CenterMembership } from "@/src/features/authorization/types";
import { isCenter, isCenterMembership } from "@/src/features/authorization/validation";

type ProvisionedTenant = {
  center: Center;
  membership: CenterMembership;
};

export type TenantContext = {
  userId: string;
  centerId: string;
  membershipId: string;
  role: CenterMembership["role"];
  tutorId: string | null;
};

export class TenantContextUnavailableError extends Error {
  constructor() {
    super("An active center context is unavailable.");
    this.name = "TenantContextUnavailableError";
  }
}

function provisionedTenants(): ProvisionedTenant[] {
  const configuredTenants = process.env.TUTOR_FLOW_PROVISIONED_TENANTS_JSON?.trim();
  if (!configuredTenants) throw new TenantContextUnavailableError();

  let parsedTenants: unknown;
  try {
    parsedTenants = JSON.parse(configuredTenants);
  } catch {
    throw new TenantContextUnavailableError();
  }
  if (!Array.isArray(parsedTenants)) throw new TenantContextUnavailableError();

  return parsedTenants.map((value): ProvisionedTenant => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new TenantContextUnavailableError();
    }

    const record = value as Record<string, unknown>;
    if (!isCenter(record.center) || !isCenterMembership(record.membership)) {
      throw new TenantContextUnavailableError();
    }
    if (record.center.centerId !== record.membership.centerId) {
      throw new TenantContextUnavailableError();
    }

    return { center: record.center, membership: record.membership };
  });
}

export async function requireTenantContext(): Promise<TenantContext> {
  const user = await requireAuthenticatedUser();
  if (user.status !== "ACTIVE") throw new TenantContextUnavailableError();

  const memberships = provisionedTenants().filter(
    ({ membership }) => membership.userId === user.userId && membership.status === "ACTIVE",
  );
  if (memberships.length !== 1) throw new TenantContextUnavailableError();

  const [{ center, membership }] = memberships;
  if (center.status !== "ACTIVE") throw new TenantContextUnavailableError();

  return {
    userId: user.userId,
    centerId: center.centerId,
    membershipId: membership.membershipId,
    role: membership.role,
    tutorId: membership.tutorId,
  };
}