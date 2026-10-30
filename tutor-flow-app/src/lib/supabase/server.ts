import "server-only";

import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  getSupabaseConfiguration,
  getSupabaseCookieOptions,
} from "@/src/features/auth/config";

export async function createServerSupabaseClient(cookieAdapter?: CookieMethodsServer) {
  const cookieStore = await cookies();
  const { projectUrl, publishableKey } = getSupabaseConfiguration();

  return createServerClient(projectUrl, publishableKey, {
    cookies: cookieAdapter ?? {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
    cookieOptions: getSupabaseCookieOptions(),
  });
}
