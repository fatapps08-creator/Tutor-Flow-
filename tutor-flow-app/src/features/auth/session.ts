import "server-only";

import { isDevelopmentAuthBypassEnabled } from "@/src/features/auth/config";
import { findProvisionedUserBySupabaseUserId } from "@/src/features/auth/user-directory";
import type { CurrentUser } from "@/src/features/auth/types";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

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

  const supabase = await createServerSupabaseClient();
  const { data: { user: identity }, error } = await supabase.auth.getUser();
  if (error) {
    if (error.name === "AuthSessionMissingError" || error.status === 401) return null;
    throw error;
  }
  if (!identity) return null;

  const user = await findProvisionedUserBySupabaseUserId(identity.id);
  if (!user || user.status !== "ACTIVE" || user.googleSubject !== identity.id) return null;

  return {
    userId: user.userId,
    googleSubject: identity.id,
    email: user.email,
    name: user.name,
    status: user.status,
    authMethod: "supabase",
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
