import "server-only";

import { GoogleSheetsServiceError } from "@/src/lib/google-sheets/errors";

export type AppsScriptResponse = {
  success?: unknown;
  message?: unknown;
  spreadsheetName?: unknown;
  sheetNames?: unknown;
  [key: string]: unknown;
};

function getAppsScriptUrl() {
  const value = process.env.GOOGLE_APPS_SCRIPT_URL?.trim();
  if (!value) {
    throw new GoogleSheetsServiceError(
      "CONFIGURATION",
      "The Google Apps Script Web App URL is not configured on the server.",
      500,
    );
  }

  try {
    return new URL(value).toString();
  } catch {
    throw new GoogleSheetsServiceError(
      "CONFIGURATION",
      "The Google Apps Script Web App URL is invalid.",
      500,
    );
  }
}

async function parseResponse(response: Response): Promise<AppsScriptResponse> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new GoogleSheetsServiceError(
      "MALFORMED_RESPONSE",
      "The Google Apps Script Web App returned invalid JSON.",
      502,
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new GoogleSheetsServiceError(
      "MALFORMED_RESPONSE",
      "The Google Apps Script Web App returned an unexpected response.",
      502,
    );
  }

  if (!response.ok) {
    const rawMessage = (body as AppsScriptResponse).message;
    const message = typeof rawMessage === "string"
      ? rawMessage
      : "The Google Apps Script Web App request failed.";
    throw new GoogleSheetsServiceError("API_ERROR", message, 502);
  }

  return body as AppsScriptResponse;
}

export async function callGoogleAppsScript<T extends AppsScriptResponse = AppsScriptResponse>(): Promise<T> {
  let response: Response;
  try {
    response = await fetch(getAppsScriptUrl(), {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new GoogleSheetsServiceError(
      "API_ERROR",
      "The Google Apps Script Web App could not be reached.",
      502,
    );
  }

  return parseResponse(response) as Promise<T>;
}
