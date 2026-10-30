import { NextRequest, NextResponse } from "next/server";
import type { CookieOptions } from "@supabase/ssr";
import { getSiteOrigin } from "@/src/features/auth/config";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return NextResponse.json({ error: "Unable to log out." }, { status: 403 });

  try {
    if (new URL(origin).origin !== getSiteOrigin()) {
      return NextResponse.json({ error: "Unable to log out." }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Unable to log out." }, { status: 403 });
  }

  const response = NextResponse.redirect(new URL("/login", getSiteOrigin()), 303);
  const headersToSet = new Map<string, string>();
  const cookiesToSet = new Map<string, { name: string; value: string; options: CookieOptions }>();
  const supabase = await createServerSupabaseClient({
    getAll: () => request.cookies.getAll(),
    setAll(cookies, headers) {
      cookies.forEach((cookie) => cookiesToSet.set(cookie.name, cookie));
      Object.entries(headers).forEach(([name, value]) => headersToSet.set(name, value));
    },
  });
  const { error } = await supabase.auth.signOut();
  if (error) throw error;

  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });
  headersToSet.forEach((value, name) => {
    response.headers.set(name, value);
  });
  return response;
}
