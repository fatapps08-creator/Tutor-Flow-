import "server-only";

import { requireAuthenticatedUser } from "@/src/features/auth/session";
import { isDevelopmentAuthBypassEnabled } from "@/src/features/auth/config";
import { requireTenantContext } from "@/src/features/authorization/tenant-context";
import { GoogleSheetsServiceError } from "@/src/lib/google-sheets/errors";
import {
  buildAppsScriptSecurityHeaders,
  type TrustedAppsScriptContext,
} from "@/src/lib/google-apps-script/security";

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
  if (!url) {
    throw new GoogleSheetsServiceError("CONFIGURATION", "Apps Script persistence is not configured.", 500);
  }
  let endpoint: URL;
  try {
    endpoint = new URL(url);
  } catch {
    throw new GoogleSheetsServiceError("CONFIGURATION", "Apps Script persistence is not configured.", 500);
  }
  if (endpoint.protocol !== "https:") {
    throw new GoogleSheetsServiceError("CONFIGURATION", "The Apps Script endpoint must use HTTPS.", 500);
  }
  if (
    endpoint.username
    || endpoint.password
    || /(?:^|[?&])(?:apiKey|TUTOR_FLOW_API_KEY)(?:=|&|$)/i.test(endpoint.search)
  ) {
    throw new GoogleSheetsServiceError("APPS_SCRIPT_REQUEST_TARGET_INVALID");
  }
  return endpoint;
}

async function trustedContext(tutorId: string): Promise<TrustedAppsScriptContext> {
  const user = await requireAuthenticatedUser();
  if (!tutorId.trim()) {
    throw new GoogleSheetsServiceError("APPS_SCRIPT_ASSERTION_INVALID");
  }

  if (!isDevelopmentAuthBypassEnabled()) {
    const tenantContext = await requireTenantContext();
    if (!tenantContext.tutorId || tenantContext.tutorId !== tutorId) {
      throw new GoogleSheetsServiceError(
        "AUTHENTICATION",
        "The requested tutor is outside the active tenant context.",
        403,
      );
    }

    return {
      userId: user.userId,
      googleSubject: user.googleSubject ?? user.userId,
      centerId: tenantContext.centerId,
      role: tenantContext.role,
      tutorId: tenantContext.tutorId,
    };
  }

  const centerId = process.env.TUTOR_FLOW_APPS_SCRIPT_CENTER_ID?.trim();
  if (!centerId) throw new GoogleSheetsServiceError("APPS_SCRIPT_CENTER_ID_MISSING");

  return {
    userId: user.userId,
    googleSubject: user.googleSubject ?? user.userId,
    centerId,
    tutorId,
  };
}

function requestTarget(endpoint: URL) {
  return `${endpoint.pathname}${endpoint.search}`;
}

function appsScriptAudience(endpoint: URL) {
  return `${endpoint.origin}${endpoint.pathname}`;
}

async function fetchWithoutForwardingCredentials(
  endpoint: URL,
  init: RequestInit,
): Promise<Response> {
  const response = await fetch(endpoint, { ...init, redirect: "manual" });
  if (![301, 302, 303].includes(response.status)) return response;

  const location = response.headers.get("location");
  if (!location) {
    throw new GoogleSheetsServiceError("API_ERROR", "The Apps Script backend returned an invalid redirect.", 502);
  }
  const redirected = new URL(location, endpoint);
  if (redirected.protocol !== "https:" || !redirected.hostname.endsWith(".googleusercontent.com")) {
    throw new GoogleSheetsServiceError("API_ERROR", "The Apps Script backend returned an unsafe redirect.", 502);
  }

  return fetch(redirected, {
    method: "GET",
    cache: "no-store",
    redirect: "error",
  });
}

async function send(
  endpoint: URL,
  context: TrustedAppsScriptContext,
  method: "GET" | "POST",
  action: string,
  resource: AppsScriptSheet,
  bodyBytes: Uint8Array<ArrayBuffer>,
) {
  const target = requestTarget(endpoint);
  const securityHeaders = buildAppsScriptSecurityHeaders(context, {
    action,
    resource,
    method,
    requestTarget: target,
    bodyBytes,
    audience: appsScriptAudience(endpoint),
  });
  let response: Response;
  try {
    response = await fetchWithoutForwardingCredentials(endpoint, {
      method,
      headers: {
        ...securityHeaders,
        ...(method === "POST" ? { "Content-Type": "application/json; charset=utf-8" } : {}),
      },
      ...(method === "POST" ? { body: bodyBytes } : {}),
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof GoogleSheetsServiceError) throw error;
    throw new GoogleSheetsServiceError("API_ERROR", "The Apps Script backend could not be reached.", 502);
  }
  return response;
}

function backendError(payload: AppsScriptResponse<unknown>) {
  const code = payload.error ?? "SERVER_ERROR";
  const status = code === "UNAUTHORIZED" ? 502 : code === "NOT_FOUND" ? 404 : 502;
  return new GoogleSheetsServiceError("API_ERROR", undefined, status);
}

async function parse<T>(response: Response): Promise<AppsScriptResponse<T>> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new GoogleSheetsServiceError("MALFORMED_RESPONSE", "Apps Script returned invalid JSON.", 502);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new GoogleSheetsServiceError("MALFORMED_RESPONSE", "Apps Script returned an invalid response.", 502);
  }
  return payload as AppsScriptResponse<T>;
}

export async function listFromAppsScript<T>(sheet: AppsScriptSheet, tutorId: string): Promise<T[]> {
  const endpoint = configuration();
  endpoint.searchParams.set("action", "list");
  endpoint.searchParams.set("sheet", sheet);
  endpoint.searchParams.set("tutorId", tutorId);
  const context = await trustedContext(tutorId);
  const response = await send(endpoint, context, "GET", "list", sheet, new Uint8Array());
  const payload = await parse<T[]>(response);
  if (!response.ok || payload.success === false) throw backendError(payload);
  if (!Array.isArray(payload.data)) throw new GoogleSheetsServiceError("MALFORMED_RESPONSE", "Apps Script returned invalid list data.", 502);
  return payload.data;
}

export async function createInAppsScript<T>(sheet: AppsScriptSheet, tutorId: string, data: Record<string, unknown>): Promise<T> {
  return post<T>({ action: "create", sheet, tutorId, data: { ...data, tutorId } });
}

export async function updateInAppsScript<T>(sheet: AppsScriptSheet, tutorId: string, id: string, data: Record<string, unknown>): Promise<T> {
  return post<T>({ action: "update", sheet, tutorId, id, data });
}

export async function deleteFromAppsScript(sheet: AppsScriptSheet, tutorId: string, id: string): Promise<void> {
  await post<unknown>({ action: "delete", sheet, tutorId, id });
}

async function post<T>(body: Record<string, unknown>): Promise<T> {
  const endpoint = configuration();
  const tutorId = typeof body.tutorId === "string" ? body.tutorId : "";
  const context = await trustedContext(tutorId);
  const action = body.action;
  const sheet = body.sheet;
  if (
    (action !== "create" && action !== "update" && action !== "delete")
    || !isAppsScriptSheet(sheet)
    || !tutorId
  ) {
    throw new GoogleSheetsServiceError("APPS_SCRIPT_ASSERTION_INVALID");
  }
  const bodyBytes = new TextEncoder().encode(JSON.stringify(body));
  const response = await send(endpoint, context, "POST", action, sheet, bodyBytes);
  const payload = await parse<T>(response);
  if (!response.ok || payload.success === false) throw backendError(payload);
  if (
    body.action !== "delete"
    && (!payload.data || typeof payload.data !== "object" || Array.isArray(payload.data))
  ) {
    throw new GoogleSheetsServiceError("MALFORMED_RESPONSE", "Apps Script returned no record.", 502);
  }
  return payload.data as T;
}

function isAppsScriptSheet(value: unknown): value is AppsScriptSheet {
  return [
    "Tutors",
    "Students",
    "Classes",
    "ClassStudents",
    "Sessions",
    "Attendance",
    "Learning Records",
    "Registrations",
    "Payments",
    "Settings",
  ].includes(String(value));
}
