import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getSupabaseConfiguration,
  getSupabaseCookieOptions,
  isDevelopmentAuthBypassEnabled,
} from "@/src/features/auth/config";

const protectedPaths = [
  "/dashboard",
  "/schedule",
  "/students",
  "/classes",
  "/learning",
  "/registration",
  "/payments",
  "/settings",
];

export async function proxy(request: NextRequest) {
  const isProtectedPath = protectedPaths.some(
    (path) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`),
  );
  if (isProtectedPath && isDevelopmentAuthBypassEnabled()) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const { projectUrl, publishableKey } = getSupabaseConfiguration();
  const supabase = createServerClient(projectUrl, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([name, value]) => {
          response.headers.set(name, value);
        });
      },
    },
    cookieOptions: getSupabaseCookieOptions(),
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;

  if (isProtectedPath && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
