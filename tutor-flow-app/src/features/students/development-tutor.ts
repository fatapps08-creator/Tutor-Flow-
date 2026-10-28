import "server-only";

import { GoogleSheetsServiceError } from "@/src/lib/google-sheets/errors";
import { isDevelopmentAuthBypassEnabled } from "@/src/features/auth/config";
import {
  requireTenantContext,
  TenantContextUnavailableError,
} from "@/src/features/authorization/tenant-context";

const DEVELOPMENT_TUTOR_ID = "tutor-demo";

export function getStudentsTutorId() {
  if (!isDevelopmentAuthBypassEnabled()) {
    throw new GoogleSheetsServiceError(
      "CONFIGURATION",
      "The development tutor identity is available only when the development authentication bypass is enabled.",
      503,
    );
  }

  return DEVELOPMENT_TUTOR_ID;
}

export async function getCoreApiTutorId() {
  try {
    const tenantContext = await requireTenantContext();
    if (tenantContext.tutorId) return tenantContext.tutorId;

    if (isDevelopmentAuthBypassEnabled()) return DEVELOPMENT_TUTOR_ID;
    throw new GoogleSheetsServiceError(
      "AUTHENTICATION",
      "An active tutor tenant context is required for this operation.",
      403,
    );
  } catch (error) {
    if (isDevelopmentAuthBypassEnabled() && error instanceof TenantContextUnavailableError) {
      return DEVELOPMENT_TUTOR_ID;
    }
    throw error;
  }
}
