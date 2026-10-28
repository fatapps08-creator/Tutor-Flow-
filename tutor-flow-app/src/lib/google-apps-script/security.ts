import "server-only";

import { createHash, createHmac, randomUUID } from "node:crypto";
import { GoogleSheetsServiceError } from "../google-sheets/errors.ts";

export const APPS_SCRIPT_ASSERTION_HEADER = "X-Tutor-Flow-Assertion";
export const APPS_SCRIPT_API_KEY_HEADER = "X-Tutor-Flow-Api-Key";
export const APPS_SCRIPT_ASSERTION_LIFETIME_SECONDS = 60;

export type AppsScriptAssertion = {
  iss: string;
  aud: string;
  jti: string;
  sub: string;
  userId: string;
  centerId: string;
  action: string;
  resource: string;
  method: string;
  requestTarget: string;
  bodyHash: string;
  iat: number;
  exp: number;
  role?: string;
  tutorId?: string;
};

export type TrustedAppsScriptContext = {
  userId: string;
  googleSubject: string;
  centerId: string;
  role?: string;
  tutorId?: string;
};

export type AppsScriptSigningRequest = {
  action: string;
  resource: string;
  method: "GET" | "POST";
  requestTarget: string;
  bodyBytes: Uint8Array<ArrayBuffer>;
  audience: string;
};

function fail(
  code: "APPS_SCRIPT_HMAC_SECRET_MISSING" | "APPS_SCRIPT_ASSERTION_INVALID" | "APPS_SCRIPT_REQUEST_BODY_INVALID" | "APPS_SCRIPT_REQUEST_TARGET_INVALID",
): never {
  throw new GoogleSheetsServiceError(code, undefined, 500);
}

function signingSecret() {
  const secret = process.env.TUTOR_FLOW_APPS_SCRIPT_HMAC_SECRET?.trim();
  if (!secret) {
    throw new GoogleSheetsServiceError("APPS_SCRIPT_HMAC_SECRET_MISSING");
  }
  return secret;
}

export function sha256Body(bodyBytes: Uint8Array) {
  if (!(bodyBytes instanceof Uint8Array)) fail("APPS_SCRIPT_REQUEST_BODY_INVALID");
  return createHash("sha256").update(bodyBytes).digest("hex");
}

function canonicalValues(assertion: AppsScriptAssertion) {
  return [
    assertion.iss,
    assertion.aud,
    assertion.jti,
    assertion.sub,
    assertion.userId,
    assertion.centerId,
    assertion.action,
    assertion.resource,
    assertion.method,
    assertion.requestTarget,
    assertion.bodyHash,
    assertion.iat,
    assertion.exp,
    assertion.role ?? null,
    assertion.tutorId ?? null,
  ];
}

export function canonicalizeAppsScriptAssertion(assertion: AppsScriptAssertion) {
  return JSON.stringify(canonicalValues(assertion));
}

function serializeAssertion(assertion: AppsScriptAssertion) {
  return JSON.stringify({
    iss: assertion.iss,
    aud: assertion.aud,
    jti: assertion.jti,
    sub: assertion.sub,
    userId: assertion.userId,
    centerId: assertion.centerId,
    action: assertion.action,
    resource: assertion.resource,
    method: assertion.method,
    requestTarget: assertion.requestTarget,
    bodyHash: assertion.bodyHash,
    iat: assertion.iat,
    exp: assertion.exp,
    ...(assertion.role !== undefined ? { role: assertion.role } : {}),
    ...(assertion.tutorId !== undefined ? { tutorId: assertion.tutorId } : {}),
  });
}

function validateSigningInput(context: TrustedAppsScriptContext, request: AppsScriptSigningRequest) {
  if (!context || !request || typeof request.requestTarget !== "string") {
    fail("APPS_SCRIPT_ASSERTION_INVALID");
  }
  const requiredContext = [
    context.userId,
    context.googleSubject,
    context.centerId,
    request.action,
    request.resource,
    request.audience,
  ];
  if (requiredContext.some((value) => typeof value !== "string" || !value.trim())) {
    fail("APPS_SCRIPT_ASSERTION_INVALID");
  }
  if (request.method !== "GET" && request.method !== "POST") {
    fail("APPS_SCRIPT_ASSERTION_INVALID");
  }
  if (!(request.bodyBytes instanceof Uint8Array)) {
    fail("APPS_SCRIPT_REQUEST_BODY_INVALID");
  }
  if (
    (context.role !== undefined && (typeof context.role !== "string" || !context.role.trim()))
    || (context.tutorId !== undefined && (typeof context.tutorId !== "string" || !context.tutorId.trim()))
  ) {
    fail("APPS_SCRIPT_ASSERTION_INVALID");
  }
  if (
    !request.requestTarget.startsWith("/")
    || request.requestTarget.includes("#")
    || /(?:^|[?&])(?:apiKey|TUTOR_FLOW_API_KEY)=/i.test(request.requestTarget)
  ) {
    fail("APPS_SCRIPT_REQUEST_TARGET_INVALID");
  }
}

export function signCanonicalAssertion(assertion: AppsScriptAssertion) {
  const key = signingSecret();
  const payload = Buffer.from(canonicalizeAppsScriptAssertion(assertion), "utf8");
  return createHmac("sha256", key).update(payload).digest();
}

export function encodeSignedAssertion(assertion: AppsScriptAssertion) {
  const payload = Buffer.from(serializeAssertion(assertion), "utf8").toString("base64url");
  const signature = signCanonicalAssertion(assertion).toString("base64url");
  return `${payload}.${signature}`;
}

export function createSignedAppsScriptAssertion(
  context: TrustedAppsScriptContext,
  request: AppsScriptSigningRequest,
): AppsScriptAssertion {
  validateSigningInput(context, request);
  const issuedAt = Math.floor(Date.now() / 1000);
  const assertion: AppsScriptAssertion = {
    iss: "tutor-flow-nextjs",
    aud: request.audience,
    jti: randomUUID(),
    sub: context.googleSubject,
    userId: context.userId,
    centerId: context.centerId,
    action: request.action,
    resource: request.resource,
    method: request.method,
    requestTarget: request.requestTarget,
    bodyHash: sha256Body(request.bodyBytes),
    iat: issuedAt,
    exp: issuedAt + APPS_SCRIPT_ASSERTION_LIFETIME_SECONDS,
    ...(context.role !== undefined ? { role: context.role } : {}),
    ...(context.tutorId !== undefined ? { tutorId: context.tutorId } : {}),
  };
  return assertion;
}

export function buildAppsScriptSecurityHeaders(
  context: TrustedAppsScriptContext,
  request: AppsScriptSigningRequest,
) {
  const apiKey = process.env.TUTOR_FLOW_API_KEY?.trim();
  if (!apiKey) {
    throw new GoogleSheetsServiceError("APPS_SCRIPT_API_KEY_MISSING");
  }
  const secret = signingSecret();
  if (secret === apiKey) {
    throw new GoogleSheetsServiceError("APPS_SCRIPT_CREDENTIALS_MUST_DIFFER");
  }

  const assertion = createSignedAppsScriptAssertion(context, request);
  return {
    [APPS_SCRIPT_ASSERTION_HEADER]: encodeSignedAssertion(assertion),
    [APPS_SCRIPT_API_KEY_HEADER]: apiKey,
  };
}
