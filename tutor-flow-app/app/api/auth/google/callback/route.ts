import { NextRequest, NextResponse } from "next/server";
import { getSiteOrigin } from "@/src/features/auth/config";
import {
  isOAuthTransaction,
  verifyGoogleCallback,
} from "@/src/features/auth/google-oidc";
import { unsealCookiePayload } from "@/src/features/auth/sealed-cookie";
import {
  clearOAuthTransactionCookie,
  createSession,
  OAUTH_TRANSACTION_COOKIE,
} from "@/src/features/auth/session";
import { findProvisionedUserByGoogleSubject } from "@/src/features/auth/user-directory";

function loginRedirect(error: "not-authorized" | "sign-in-failed") {
  let response: NextResponse;
  try {
    response = NextResponse.redirect(new URL(`/login?error=${error}`, getSiteOrigin()));
  } catch {
    response = NextResponse.json({ error: "Sign-in could not be completed." }, { status: 503 });
  }
  clearOAuthTransactionCookie(response);
  return response;
}

export async function GET(request: NextRequest) {
  try {
    const transactionToken = request.cookies.get(OAUTH_TRANSACTION_COOKIE)?.value;
    const transaction = transactionToken
      ? unsealCookiePayload(transactionToken)
      : null;
    if (!isOAuthTransaction(transaction)) {
      return loginRedirect("sign-in-failed");
    }

    const callbackUrl = new URL(
      `/api/auth/google/callback${request.nextUrl.search}`,
      getSiteOrigin(),
    );
    const identity = await verifyGoogleCallback(callbackUrl, transaction);
    const user = await findProvisionedUserByGoogleSubject(identity.googleSubject);
    if (!user || user.status !== "ACTIVE") {
      return loginRedirect("not-authorized");
    }

    const response = NextResponse.redirect(new URL("/dashboard", getSiteOrigin()));
    clearOAuthTransactionCookie(response);
    createSession(response, user);
    return response;
  } catch {
    return loginRedirect("sign-in-failed");
  }
}
