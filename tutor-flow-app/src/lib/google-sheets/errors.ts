export type GoogleSheetsErrorCode =
  | "CONFIGURATION"
  | "AUTHENTICATION"
  | "AUTHORIZATION"
  | "SPREADSHEET_NOT_FOUND"
  | "WORKSHEET_NOT_FOUND"
  | "MALFORMED_RESPONSE"
  | "INVALID_ARGUMENT"
  | "API_ERROR"
  | "APPS_SCRIPT_HMAC_SECRET_MISSING"
  | "APPS_SCRIPT_API_KEY_MISSING"
  | "APPS_SCRIPT_ASSERTION_INVALID"
  | "APPS_SCRIPT_REQUEST_BODY_INVALID"
  | "APPS_SCRIPT_REQUEST_TARGET_INVALID"
  | "APPS_SCRIPT_CREDENTIALS_MUST_DIFFER"
  | "APPS_SCRIPT_CENTER_ID_MISSING";

const safeMessages: Record<GoogleSheetsErrorCode, string> = {
  CONFIGURATION: "Google Sheets is not configured on the server.",
  AUTHENTICATION: "Google Sheets access was denied. Check the service account permissions.",
  AUTHORIZATION: "The active tenant role is not authorized for this operation.",
  SPREADSHEET_NOT_FOUND: "The configured Google spreadsheet could not be found.",
  WORKSHEET_NOT_FOUND: "The requested worksheet does not exist in the configured spreadsheet.",
  MALFORMED_RESPONSE: "Google Sheets returned data in an unexpected format.",
  INVALID_ARGUMENT: "The Google Sheets operation received invalid data.",
  API_ERROR: "The Google Sheets operation failed. Please try again.",
  APPS_SCRIPT_HMAC_SECRET_MISSING: "Apps Script request signing is not configured on the server.",
  APPS_SCRIPT_API_KEY_MISSING: "Apps Script authentication is not configured on the server.",
  APPS_SCRIPT_ASSERTION_INVALID: "The Apps Script request context is invalid.",
  APPS_SCRIPT_REQUEST_BODY_INVALID: "The Apps Script request body is invalid.",
  APPS_SCRIPT_REQUEST_TARGET_INVALID: "The Apps Script request target is invalid.",
  APPS_SCRIPT_CREDENTIALS_MUST_DIFFER: "Apps Script credentials must be configured separately.",
  APPS_SCRIPT_CENTER_ID_MISSING: "Apps Script center scope is not configured on the server.",
};

export class GoogleSheetsServiceError extends Error {
  readonly code: GoogleSheetsErrorCode;
  readonly status: number;

  constructor(code: GoogleSheetsErrorCode, message = safeMessages[code], status = 500) {
    super(message);
    this.name = "GoogleSheetsServiceError";
    this.code = code;
    this.status = status;
  }
}

export function toSafeGoogleSheetsError(error: unknown) {
  if (error instanceof GoogleSheetsServiceError) {
    return { code: error.code, message: error.message, status: error.status };
  }

  const status = getHttpStatus(error);
  if (status === 401 || status === 403 || isAuthenticationError(error)) {
    return {
      code: "AUTHENTICATION" as const,
      message: safeMessages.AUTHENTICATION,
      status: 503,
    };
  }
  if (status === 404) {
    return {
      code: "SPREADSHEET_NOT_FOUND" as const,
      message: safeMessages.SPREADSHEET_NOT_FOUND,
      status: 503,
    };
  }
  return {
    code: "API_ERROR" as const,
    message: safeMessages.API_ERROR,
    status: 502,
  };
}

export function toGoogleSheetsErrorResponse(error: unknown) {
  const safeError = toSafeGoogleSheetsError(error);
  return Response.json(
    { error: { code: safeError.code, message: safeError.message } },
    { status: safeError.status },
  );
}

function getHttpStatus(error: unknown) {
  if (!error || typeof error !== "object") return undefined;
  const candidate = error as {
    code?: unknown;
    response?: { status?: unknown };
  };
  const status = candidate.response?.status ?? candidate.code;
  return typeof status === "number" ? status : undefined;
}

function isAuthenticationError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as {
    message?: unknown;
    response?: { data?: { error?: { status?: unknown; message?: unknown; errors?: Array<{ reason?: unknown }> } } };
  };
  const apiError = candidate.response?.data?.error;
  const reason = apiError?.errors?.map((item) => item.reason).join(" ") ?? "";
  const description = [
    candidate.message,
    apiError?.status,
    apiError?.message,
    reason,
  ].filter((value): value is string => typeof value === "string").join(" ");
  return /invalid[_ ]grant|invalid jwt|invalid credentials|unauthenticated|authError/i.test(description);
}
