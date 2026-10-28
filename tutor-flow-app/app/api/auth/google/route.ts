import { NextResponse } from "next/server";
import { createGoogleAuthorizationRequest } from "@/src/features/auth/google-oidc";
import {
  getSiteOrigin,
  isDevelopmentAuthBypassEnabled,
} from "@/src/features/auth/config";
import {
  setOAuthTransactionCookie,
} from "@/src/features/auth/session";

export async function GET() {
  if (isDevelopmentAuthBypassEnabled()) {
    try {
      return NextResponse.redirect(new URL("/dashboard", getSiteOrigin()));
    } catch {
      return NextResponse.json({ error: "Authentication is unavailable." }, { status: 503 });
    }
  }

  try {
    const { authorizationUrl, transaction } = await createGoogleAuthorizationRequest();
    const response = NextResponse.redirect(authorizationUrl);
    setOAuthTransactionCookie(response, transaction);
    return response;
  } catch {
    try {
      return NextResponse.redirect(new URL("/login?error=unavailable", getSiteOrigin()));
    } catch {
      return NextResponse.json({ error: "Authentication is unavailable." }, { status: 503 });
    }
  }
}
