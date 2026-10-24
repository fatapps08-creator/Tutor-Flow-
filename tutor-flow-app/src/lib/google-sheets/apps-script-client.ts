import "server-only";

import { GoogleSheetsServiceError } from "./errors";
import type { GoogleSheetTabName } from "@/src/types";

export type AppsScriptRow = Record<string, unknown>;
type Envelope<T> = { success: boolean; data: T | null; error: null | { code?: string; message?: string } };

function getUrl() {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL?.trim();
  if (!url) throw new GoogleSheetsServiceError("CONFIGURATION", "GOOGLE_APPS_SCRIPT_URL is not configured on the server.", 500);
  return url;
}

export async function appsScriptRequest<T>(operation: "list" | "create" | "update" | "delete", resource: GoogleSheetTabName, options: { tutorId: string; id?: string; data?: AppsScriptRow }) {
  if (!options.tutorId.trim()) throw new GoogleSheetsServiceError("INVALID_ARGUMENT", "A tutor ID is required.", 400);
  const url = new URL(getUrl());
  url.searchParams.set("resource", resource);
  url.searchParams.set("operation", operation);
  url.searchParams.set("tutorId", options.tutorId);
  if (options.id) url.searchParams.set("id", options.id);
  let response: Response;
  try {
    response = await fetch(url, {
      method: operation === "list" ? "GET" : operation === "create" ? "POST" : operation === "update" ? "PATCH" : "DELETE",
      headers: { "content-type": "application/json" },
      body: operation === "list" || operation === "delete" ? undefined : JSON.stringify(options.data ?? {}),
      cache: "no-store",
    });
  } catch {
    throw new GoogleSheetsServiceError("API_ERROR", "The Apps Script Web App could not be reached.", 502);
  }
  let envelope: Envelope<T>;
  try { envelope = await response.json() as Envelope<T>; } catch { throw new GoogleSheetsServiceError("MALFORMED_RESPONSE", "The Apps Script Web App returned invalid JSON.", 502); }
  if (!response.ok || !envelope.success) {
    throw new GoogleSheetsServiceError((envelope.error?.code as never) || "API_ERROR", envelope.error?.message || "The Apps Script operation failed.", response.status >= 400 ? response.status : 502);
  }
  return envelope.data as T;
}
