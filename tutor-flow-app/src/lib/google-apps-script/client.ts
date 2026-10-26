import "server-only";

import { GoogleSheetsServiceError } from "@/src/lib/google-sheets/errors";

export type AppsScriptSheet =
  | "Tutors"
  | "Students"
  | "Classes"
  | "ClassStudents"
  | "Sessions"
  | "Attendance"
  | "Learning Records"
  | "Registrations"
  | "Payments"
  | "Settings";

type AppsScriptResponse<T> = {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
};

function configuration() {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL?.trim();
  const apiKey = process.env.TUTOR_FLOW_API_KEY?.trim();
  if (!url || !apiKey) {
    throw new GoogleSheetsServiceError("CONFIGURATION", "Apps Script persistence is not configured.", 500);
  }
  return { url, apiKey };
}

function backendError(payload: AppsScriptResponse<unknown>) {
  const code = payload.error ?? "SERVER_ERROR";
  const status = code === "UNAUTHORIZED" ? 502 : code === "NOT_FOUND" ? 404 : 502;
  return new GoogleSheetsServiceError("API_ERROR", payload.message ?? `Apps Script request failed: ${code}.`, status);
}

async function parse<T>(response: Response): Promise<AppsScriptResponse<T>> {
  try {
    return await response.json() as AppsScriptResponse<T>;
  } catch {
    throw new GoogleSheetsServiceError("MALFORMED_RESPONSE", "Apps Script returned invalid JSON.", 502);
  }
}

export async function listFromAppsScript<T>(sheet: AppsScriptSheet, tutorId: string): Promise<T[]> {
  const { url, apiKey } = configuration();
  const endpoint = new URL(url);
  endpoint.searchParams.set("action", "list");
  endpoint.searchParams.set("sheet", sheet);
  endpoint.searchParams.set("tutorId", tutorId);
  endpoint.searchParams.set("apiKey", apiKey);
  let response: Response;
  try { response = await fetch(endpoint, { cache: "no-store", redirect: "follow" }); }
  catch { throw new GoogleSheetsServiceError("API_ERROR", "The Apps Script backend could not be reached.", 502); }
  const payload = await parse<T[]>(response);
  if (!response.ok || payload.success === false) throw backendError(payload);
  if (!Array.isArray(payload.data)) throw new GoogleSheetsServiceError("MALFORMED_RESPONSE", "Apps Script returned invalid list data.", 502);
  return payload.data;
}

export async function createInAppsScript<T>(sheet: AppsScriptSheet, tutorId: string, data: Record<string, unknown>): Promise<T> {
  return post<T>({ action: "create", sheet, data: { ...data, tutorId } });
}

export async function updateInAppsScript<T>(sheet: AppsScriptSheet, tutorId: string, id: string, data: Record<string, unknown>): Promise<T> {
  return post<T>({ action: "update", sheet, tutorId, id, data });
}

export async function deleteFromAppsScript(sheet: AppsScriptSheet, tutorId: string, id: string): Promise<void> {
  await post<unknown>({ action: "delete", sheet, tutorId, id });
}

async function post<T>(body: Record<string, unknown>): Promise<T> {
  const { url, apiKey } = configuration();
  let response: Response;
  try {
    response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, apiKey }), cache: "no-store", redirect: "follow" });
  } catch { throw new GoogleSheetsServiceError("API_ERROR", "The Apps Script backend could not be reached.", 502); }
  const payload = await parse<T>(response);
  if (!response.ok || payload.success === false) throw backendError(payload);
  if (body.action !== "delete" && payload.data === undefined) throw new GoogleSheetsServiceError("MALFORMED_RESPONSE", "Apps Script returned no record.", 502);
  return payload.data as T;
}
