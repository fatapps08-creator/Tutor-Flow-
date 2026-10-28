import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { AuthConfigurationError } from "@/src/features/auth/config";

function getEncryptionKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) throw new AuthConfigurationError();
  return createHash("sha256").update(secret).digest();
}

export function sealCookiePayload(payload: Record<string, unknown>) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
}

export function unsealCookiePayload(value: string) {
  const key = getEncryptionKey();
  try {
    const [ivValue, tagValue, encryptedValue, ...extra] = value.split(".");
    if (!ivValue || !tagValue || !encryptedValue || extra.length > 0) return null;

    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivValue, "base64url"));
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    const payload: unknown = JSON.parse(decrypted);
    return payload && typeof payload === "object" && !Array.isArray(payload)
      ? payload as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}
