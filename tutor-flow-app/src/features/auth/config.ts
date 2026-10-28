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

export function getGoogleOAuthConfiguration() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new AuthConfigurationError();

  const siteOrigin = getSiteOrigin();
  return {
    clientId,
    clientSecret,
    siteOrigin,
    redirectUri: new URL("/api/auth/google/callback", siteOrigin).toString(),
  };
}

export function isDevelopmentAuthBypassEnabled() {
  return process.env.NODE_ENV === "development"
    && process.env.TUTOR_FLOW_DEV_AUTH_BYPASS === "true";
}
