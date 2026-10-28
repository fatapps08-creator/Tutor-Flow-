import "server-only";

import type { CenterMembershipRole } from "@/src/features/authorization/types";
import {
  requireTenantContext,
  type TenantContext,
} from "@/src/features/authorization/tenant-context";

const centerMembershipRoles = new Set<CenterMembershipRole>([
  "OWNER",
  "ADMIN",
  "TUTOR",
  "STAFF",
]);

export class RoleAuthorizationError extends Error {
  constructor() {
    super("The active tenant role is not authorized for this operation.");
    this.name = "RoleAuthorizationError";
  }
}

export async function requireRole(
  ...allowedRoles: CenterMembershipRole[]
): Promise<TenantContext> {
  if (
    allowedRoles.length === 0
    || allowedRoles.some((role) => !centerMembershipRoles.has(role))
  ) {
    throw new RoleAuthorizationError();
  }

  const tenantContext = await requireTenantContext();
  if (!centerMembershipRoles.has(tenantContext.role) || !allowedRoles.includes(tenantContext.role)) {
    throw new RoleAuthorizationError();
  }

  return tenantContext;
}
