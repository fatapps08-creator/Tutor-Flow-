import "server-only";

import {
  authorizationCodeGrant,
  buildAuthorizationUrl,
  calculatePKCECodeChallenge,
  ClientSecretPost,
  discovery,
  randomNonce,
  randomPKCECodeVerifier,
  randomState,
  type Configuration,
} from "openid-client";
import { AuthConfigurationError, getGoogleOAuthConfiguration } from "@/src/features/auth/config";

export type OAuthTransaction = {
  purpose: "google-oauth-transaction";
  state: string;
  nonce: string;
  codeVerifier: string;
  expiresAt: number;
};

let configurationPromise: Promise<Configuration> | undefined;

async function getOidcConfiguration() {
  if (!configurationPromise) {
    const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfiguration();
    configurationPromise = discovery(
      new URL("https://accounts.google.com"),
      clientId,
      {
        redirect_uris: [redirectUri],
        response_types: ["code"],
      },
      ClientSecretPost(clientSecret),
    ).catch((error: unknown) => {
      configurationPromise = undefined;
      throw error;
    });
  }
  return configurationPromise;
}

export async function createGoogleAuthorizationRequest() {
  const { redirectUri } = getGoogleOAuthConfiguration();
  const configuration = await getOidcConfiguration();
  const codeVerifier = randomPKCECodeVerifier();
  const codeChallenge = await calculatePKCECodeChallenge(codeVerifier);
  const transaction: OAuthTransaction = {
    purpose: "google-oauth-transaction",
    state: randomState(),
    nonce: randomNonce(),
    codeVerifier,
    expiresAt: Date.now() + 10 * 60 * 1000,
  };

  const authorizationUrl = buildAuthorizationUrl(configuration, {
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: transaction.state,
    nonce: transaction.nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return { authorizationUrl, transaction };
}

export async function verifyGoogleCallback(
  callbackUrl: URL,
  transaction: OAuthTransaction,
) {
  const configuration = await getOidcConfiguration();
  const { redirectUri } = getGoogleOAuthConfiguration();
  const tokens = await authorizationCodeGrant(
    configuration,
    callbackUrl,
    {
      expectedState: transaction.state,
      expectedNonce: transaction.nonce,
      pkceCodeVerifier: transaction.codeVerifier,
    },
    { redirect_uri: redirectUri },
  );
  const claims = tokens.claims();
  if (
    !claims
    || typeof claims.sub !== "string"
    || !claims.sub
    || typeof claims.email !== "string"
    || claims.email_verified !== true
  ) {
    throw new AuthConfigurationError();
  }

  return {
    googleSubject: claims.sub,
    email: claims.email,
    name: typeof claims.name === "string" ? claims.name : "",
  };
}

export function isOAuthTransaction(value: Record<string, unknown> | null): value is Record<string, unknown> & OAuthTransaction {
  return Boolean(
    value
    && value.purpose === "google-oauth-transaction"
    && typeof value.state === "string"
    && typeof value.nonce === "string"
    && typeof value.codeVerifier === "string"
    && typeof value.expiresAt === "number"
    && value.expiresAt > Date.now(),
  );
}
