import { NextRequest, NextResponse } from "next/server";
import type { CookieOptions } from "@supabase/ssr";
import { getSiteOrigin } from "@/src/features/auth/config";
import { findProvisionedUserBySupabaseUserId } from "@/src/features/auth/user-directory";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

type PendingCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

function isTrustedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === getSiteOrigin();
  } catch {
    return false;
  }
}

function redirectWithCookies(
  location: string,
  cookiesToSet: Map<string, PendingCookie>,
  headersToSet: Map<string, string>,
) {
  const response = NextResponse.redirect(location, 303);
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });
  headersToSet.forEach((value, name) => {
    response.headers.set(name, value);
  });
  return response;
}

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "Unable to sign in." }, { status: 403 });
  }

  const formData = await request.formData();
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");
  const siteOrigin = getSiteOrigin();
  const loginUrl = new URL("/login?error=sign-in-failed", siteOrigin).toString();
  const cookiesToSet = new Map<string, PendingCookie>();
  const headersToSet = new Map<string, string>();

  if (typeof emailValue !== "string" || typeof passwordValue !== "string" || !emailValue.trim() || !passwordValue) {
    return redirectWithCookies(loginUrl, cookiesToSet, headersToSet);
  }

  const supabase = await createServerSupabaseClient({
    getAll: () => request.cookies.getAll(),
    setAll(cookies, headers) {
      cookies.forEach((cookie) => cookiesToSet.set(cookie.name, cookie));
      Object.entries(headers).forEach(([name, value]) => headersToSet.set(name, value));
    },
  });
  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailValue.trim(),
    password: passwordValue,
  });

  if (error || !data.user) {
    return redirectWithCookies(loginUrl, cookiesToSet, headersToSet);
  }

  const provisionedUser = await findProvisionedUserBySupabaseUserId(data.user.id);
  if (
    !data.user.email_confirmed_at
    || !provisionedUser
    || provisionedUser.status !== "ACTIVE"
  ) {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) throw signOutError;

    return redirectWithCookies(
      new URL("/login?error=not-authorized", siteOrigin).toString(),
      cookiesToSet,
      headersToSet,
    );
  }

  return redirectWithCookies(
    new URL("/dashboard", siteOrigin).toString(),
    cookiesToSet,
    headersToSet,
  );
}
