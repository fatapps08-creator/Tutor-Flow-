import "server-only";

import { GoogleSheetsServiceError } from "@/src/lib/google-sheets/errors";

type AppsScriptResponse<T> = {
  success?: boolean;
  data?: T;
  rows?: T;
  error?: unknown;
  message?: unknown;
};

export type AppsScriptRequest = {
  action: "list" | "create" | "update" | "delete";
  sheet: string;
  tutorId: string;
  record?: Record<string, unknown>;
  id?: string;
};

function getConfiguration() {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL?.trim();
  if (!url) {
    throw new GoogleSheetsServiceError(
      "CONFIGURATION",
      "Missing required server environment variables: GOOGLE_APPS_SCRIPT_URL.",
      500,
    );
  }
  return { url };
}

function responseMessage(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export async function callGoogleAppsScript<T>(request: AppsScriptRequest): Promise<T> {
  if (!request.tutorId.trim()) {
    throw new GoogleSheetsServiceError("INVALID_ARGUMENT", "A tutor ID is required.", 400);
  }

  const { url } = getConfiguration();
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      cache: "no-store",
    });
  } catch {
    throw new GoogleSheetsServiceError("API_ERROR", "The Apps Script backend could not be reached.", 502);
  }

  let payload: AppsScriptResponse<T>;
  try {
    payload = await response.json() as AppsScriptResponse<T>;
  } catch {
    throw new GoogleSheetsServiceError("MALFORMED_RESPONSE", "Apps Script returned invalid JSON.", 502);
  }

  if (!response.ok) {
    throw new GoogleSheetsServiceError(
      "API_ERROR",
      responseMessage(payload.message) ?? "The Apps Script backend returned an error.",
      502,
    );
  }
  if (payload.success === false) {
    throw new GoogleSheetsServiceError(
      "API_ERROR",
      responseMessage(payload.message) ?? responseMessage(payload.error) ?? "The Apps Script backend rejected the request.",
      502,
    );
  }

  const data = payload.data ?? payload.rows;
  if (data === undefined) {
    throw new GoogleSheetsServiceError("MALFORMED_RESPONSE", "Apps Script returned no data.", 502);
  }
  return data;
}
