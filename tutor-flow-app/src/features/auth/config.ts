import "server-only";

export class AuthConfigurationError extends Error {
  constructor() {
    super("Authentication is not configured.");
    this.name = "AuthConfigurationError";
  }
}

export function getSiteOrigin() {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!value) throw new AuthConfigurationError();

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new AuthConfigurationError();
  }

  const localHost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (
    (url.protocol !== "https:" && !(process.env.NODE_ENV === "development" && localHost && url.protocol === "http:"))
    || url.username
    || url.password
    || (url.pathname !== "/" && url.pathname !== "")
    || url.search
    || url.hash
  ) {
    throw new AuthConfigurationError();
  }

  return url.origin;
}

export function getSupabaseConfiguration() {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!projectUrl || !publishableKey) throw new AuthConfigurationError();

  let url: URL;
  try {
    url = new URL(projectUrl);
  } catch {
    throw new AuthConfigurationError();
  }

  const localHost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (
    (url.protocol !== "https:" && !(process.env.NODE_ENV === "development" && localHost && url.protocol === "http:"))
    || url.username
    || url.password
    || (url.pathname !== "/" && url.pathname !== "")
    || url.search
    || url.hash
  ) {
    throw new AuthConfigurationError();
  }

  return { projectUrl: url.origin, publishableKey };
}

export function getSupabaseCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

export function isDevelopmentAuthBypassEnabled() {
  return process.env.NODE_ENV === "development"
    && process.env.TUTOR_FLOW_DEV_AUTH_BYPASS === "true";
}
