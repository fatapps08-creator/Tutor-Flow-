import "server-only";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { isDevelopmentAuthBypassEnabled } from "@/src/features/auth/config";
import { unsealCookiePayload, sealCookiePayload } from "@/src/features/auth/sealed-cookie";
import { findProvisionedUserByGoogleSubject } from "@/src/features/auth/user-directory";
import type { CurrentUser, TutorFlowUser } from "@/src/features/auth/types";

export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
export const OAUTH_TRANSACTION_MAX_AGE_SECONDS = 10 * 60;
export const OAUTH_TRANSACTION_COOKIE = "tutor-flow-oauth-transaction";
export const SESSION_COOKIE = process.env.NODE_ENV === "production"
  ? "__Host-tutor-flow-session"
  : "tutor-flow-session";

type SessionClaims = {
  purpose: "tutor-flow-session";
  sessionId: string;
  userId: string;
  googleSubject: string;
  issuedAt: number;
  expiresAt: number;
};

function cookieOptions(path: string, maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path,
    maxAge,
  };
}

export function setOAuthTransactionCookie(response: NextResponse, transaction: Record<string, unknown>) {
  response.cookies.set(
    OAUTH_TRANSACTION_COOKIE,
    sealCookiePayload(transaction),
    cookieOptions("/api/auth/google", OAUTH_TRANSACTION_MAX_AGE_SECONDS),
  );
}

export function clearOAuthTransactionCookie(response: NextResponse) {
  response.cookies.set(OAUTH_TRANSACTION_COOKIE, "", {
    ...cookieOptions("/api/auth/google", 0),
    expires: new Date(0),
  });
}

export function createSession(response: NextResponse, user: TutorFlowUser) {
  if (user.status !== "ACTIVE" || !user.userId || !user.googleSubject) {
    throw new Error("An active provisioned user is required to create a session.");
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const claims: SessionClaims = {
    purpose: "tutor-flow-session",
    sessionId: randomUUID(),
    userId: user.userId,
    googleSubject: user.googleSubject,
    issuedAt,
    expiresAt: issuedAt + SESSION_MAX_AGE_SECONDS,
  };
  response.cookies.set(
    SESSION_COOKIE,
    sealCookiePayload(claims),
    cookieOptions("/", SESSION_MAX_AGE_SECONDS),
  );
}

export function destroySession(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    ...cookieOptions("/", 0),
    expires: new Date(0),
  });
  clearOAuthTransactionCookie(response);
}

function isSessionClaims(value: Record<string, unknown> | null): value is Record<string, unknown> & SessionClaims {
  const now = Math.floor(Date.now() / 1000);
  return Boolean(
    value
    && value.purpose === "tutor-flow-session"
    && typeof value.sessionId === "string"
    && typeof value.userId === "string"
    && typeof value.googleSubject === "string"
    && typeof value.issuedAt === "number"
    && typeof value.expiresAt === "number"
    && value.issuedAt <= now + 60
    && value.expiresAt > now
    && value.expiresAt - value.issuedAt <= SESSION_MAX_AGE_SECONDS,
  );
}

const developmentUser: CurrentUser = {
  userId: "dev:tutor-demo",
  googleSubject: null,
  email: null,
  name: "Development Tutor",
  status: "ACTIVE",
  authMethod: "development",
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (isDevelopmentAuthBypassEnabled()) return developmentUser;

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const claims = unsealCookiePayload(token);
  if (!isSessionClaims(claims)) return null;

  const user = await findProvisionedUserByGoogleSubject(claims.googleSubject);
  if (
    !user
    || user.status !== "ACTIVE"
    || user.userId !== claims.userId
    || user.googleSubject !== claims.googleSubject
  ) {
    return null;
  }

  return {
    userId: user.userId,
    googleSubject: user.googleSubject,
    email: user.email,
    name: user.name,
    status: user.status,
    authMethod: "google",
  };
}

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication is required.");
    this.name = "AuthenticationRequiredError";
  }
}

export async function requireAuthenticatedUser() {
  const user = await getCurrentUser();
  if (!user) throw new AuthenticationRequiredError();
  return user;
}
