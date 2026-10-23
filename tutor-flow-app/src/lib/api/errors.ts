import "server-only";

import { GoogleSheetsServiceError, toGoogleSheetsErrorResponse } from "@/src/lib/google-sheets/errors";

export { GoogleSheetsServiceError };

export function toApiErrorResponse(error: unknown) {
  return toGoogleSheetsErrorResponse(error);
}
