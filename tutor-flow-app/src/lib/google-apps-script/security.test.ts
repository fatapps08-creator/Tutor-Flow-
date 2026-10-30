import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  APPS_SCRIPT_ASSERTION_LIFETIME_SECONDS,
  APPS_SCRIPT_API_KEY_HEADER,
  APPS_SCRIPT_ASSERTION_HEADER,
  buildAppsScriptSecurityHeaders,
  canonicalizeAppsScriptAssertion,
  createSignedAppsScriptAssertion,
  encodeSignedAssertion,
  sha256Body,
  signCanonicalAssertion,
  type AppsScriptAssertion,
  type AppsScriptSigningRequest,
  type TrustedAppsScriptContext,
} from "./security.ts";

process.env.TUTOR_FLOW_APPS_SCRIPT_HMAC_SECRET = "test-hmac-secret-distinct-from-api-key";
process.env.TUTOR_FLOW_API_KEY = "test-api-key-distinct-from-hmac-secret";

const context: TrustedAppsScriptContext = {
  userId: "user-42",
  googleSubject: "google-sub-42",
  centerId: "center-7",
  role: "TUTOR",
  tutorId: "tutor-3",
};

const request: AppsScriptSigningRequest = {
  action: "create",
  resource: "Students",
  method: "POST",
  requestTarget: "/macros/s/deployment/exec",
  bodyBytes: new TextEncoder().encode('{"action":"create","sheet":"Students"}'),
  audience: "https://script.google.com/macros/s/deployment/exec",
};

const fixedAssertion: AppsScriptAssertion = {
  iss: "tutor-flow-nextjs",
  aud: request.audience,
  jti: "5fb4c087-1f30-4f98-91ad-ec8fdb72bc02",
  sub: context.googleSubject,
  userId: context.userId,
  centerId: context.centerId,
  action: request.action,
  resource: request.resource,
  method: request.method,
  requestTarget: request.requestTarget,
  bodyHash: sha256Body(request.bodyBytes),
  iat: 1_798_836_000,
  exp: 1_798_836_060,
  role: context.role,
  tutorId: context.tutorId,
};

test("fixed B2.1 known-answer vector matches independently calculated UTF-8 and HMAC-SHA-256", () => {
  const vector: AppsScriptAssertion = {
    iss: "tutor-flow-nextjs",
    aud: "https://script.google.com/macros/s/test-deployment/exec",
    jti: "00000000-0000-4000-8000-000000000001",
    sub: "google-subject-001",
    userId: "user-001",
    centerId: "center-001",
    action: "create",
    resource: "Students",
    method: "POST",
    requestTarget: "/macros/s/test-deployment/exec?action=create&sheet=Students",
    bodyHash: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    iat: 1_790_000_000,
    exp: 1_790_000_060,
    role: "TUTOR",
    tutorId: "tutor-001",
  };
  const expectedCanonical = '["tutor-flow-nextjs","https://script.google.com/macros/s/test-deployment/exec","00000000-0000-4000-8000-000000000001","google-subject-001","user-001","center-001","create","Students","POST","/macros/s/test-deployment/exec?action=create&sheet=Students","ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",1790000000,1790000060,"TUTOR","tutor-001"]';
  const expectedCanonicalHex = "5b227475746f722d666c6f772d6e6578746a73222c2268747470733a2f2f7363726970742e676f6f676c652e636f6d2f6d6163726f732f732f746573742d6465706c6f796d656e742f65786563222c2230303030303030302d303030302d343030302d383030302d303030303030303030303031222c22676f6f676c652d7375626a6563742d303031222c22757365722d303031222c2263656e7465722d303031222c22637265617465222c2253747564656e7473222c22504f5354222c222f6d6163726f732f732f746573742d6465706c6f796d656e742f657865633f616374696f6e3d6372656174652673686565743d53747564656e7473222c2262613738313662663866303163666561343134313430646535646165323232336230303336316133393631373761396362343130666636316632303031356164222c313739303030303030302c313739303030303036302c225455544f52222c227475746f722d303031225d";
  const originalSecret = process.env.TUTOR_FLOW_APPS_SCRIPT_HMAC_SECRET;
  process.env.TUTOR_FLOW_APPS_SCRIPT_HMAC_SECRET = "B2.1-known-answer-test-secret-2026";
  try {
    const canonical = canonicalizeAppsScriptAssertion(vector);
    const canonicalBytes = Buffer.from(canonical, "utf8");
    assert.equal(canonical, expectedCanonical);
    assert.equal(canonicalBytes.toString("hex"), expectedCanonicalHex);
    assert.equal(
      signCanonicalAssertion(vector).toString("base64url"),
      "TcmlPY2UsdcSfGY5mtz_g0VFzlyabQh2CeFLbYol4nA",
    );
  } finally {
    if (originalSecret === undefined) delete process.env.TUTOR_FLOW_APPS_SCRIPT_HMAC_SECRET;
    else process.env.TUTOR_FLOW_APPS_SCRIPT_HMAC_SECRET = originalSecret;
  }
});

test("canonical representation and signature are deterministic", () => {
  assert.equal(
    canonicalizeAppsScriptAssertion(fixedAssertion),
    canonicalizeAppsScriptAssertion({ ...fixedAssertion }),
  );
  assert.deepEqual(signCanonicalAssertion(fixedAssertion), signCanonicalAssertion({ ...fixedAssertion }));
});

test("body hash is SHA-256 of exact UTF-8 bytes", () => {
  const expected = createHash("sha256").update(request.bodyBytes).digest("hex");
  assert.equal(sha256Body(request.bodyBytes), expected);
  assert.notEqual(sha256Body(request.bodyBytes), sha256Body(new TextEncoder().encode("modified")));
});

test("request target and method are part of the canonical payload", () => {
  assert.notEqual(
    canonicalizeAppsScriptAssertion(fixedAssertion),
    canonicalizeAppsScriptAssertion({ ...fixedAssertion, requestTarget: "/other/target" }),
  );
  assert.notEqual(
    canonicalizeAppsScriptAssertion(fixedAssertion),
    canonicalizeAppsScriptAssertion({ ...fixedAssertion, method: "GET" }),
  );
});

test("request target changes for path, query value/order, encoding, and trailing slash", () => {
  const original = fixedAssertion.requestTarget;
  const changedTargets = [
    "/macros/other/deployment/exec?action=create&sheet=Students",
    "/macros/s/test-deployment/exec?action=update&sheet=Students",
    "/macros/s/test-deployment/exec?sheet=Students&action=create",
    "/macros/s/test-deployment/exec?action=create&sheet=%53tudents",
    "/macros/s/test-deployment/exec/?action=create&sheet=Students",
  ];
  const originalSignature = signCanonicalAssertion(fixedAssertion);
  for (const requestTarget of changedTargets) {
    const changed = { ...fixedAssertion, requestTarget };
    assert.notEqual(canonicalizeAppsScriptAssertion(changed), canonicalizeAppsScriptAssertion(fixedAssertion));
    assert.notDeepEqual(signCanonicalAssertion(changed), originalSignature);
  }
  assert.ok(original.startsWith("/"));
});

test("assertion and body modifications change the signature", () => {
  const originalSignature = signCanonicalAssertion(fixedAssertion);
  const changedAssertion = { ...fixedAssertion, centerId: "other-center" };
  const changedBody = {
    ...fixedAssertion,
    bodyHash: sha256Body(new TextEncoder().encode("different body")),
  };
  assert.notDeepEqual(originalSignature, signCanonicalAssertion(changedAssertion));
  assert.notDeepEqual(originalSignature, signCanonicalAssertion(changedBody));
});

test("optional role and tutorId are represented as JSON null when absent", () => {
  const withoutOptionalFields = { ...fixedAssertion };
  delete withoutOptionalFields.role;
  delete withoutOptionalFields.tutorId;
  assert.equal(
    canonicalizeAppsScriptAssertion(withoutOptionalFields),
    '["tutor-flow-nextjs","https://script.google.com/macros/s/deployment/exec","5fb4c087-1f30-4f98-91ad-ec8fdb72bc02","google-sub-42","user-42","center-7","create","Students","POST","/macros/s/deployment/exec","' + fixedAssertion.bodyHash + '",1798836000,1798836060,null,null]',
  );
});

test("empty optional strings remain empty strings rather than becoming null", () => {
  const withEmptyRole = { ...fixedAssertion, role: "" };
  assert.ok(canonicalizeAppsScriptAssertion(withEmptyRole).endsWith(',"","tutor-3"]'));
  assert.notEqual(
    canonicalizeAppsScriptAssertion(withEmptyRole),
    canonicalizeAppsScriptAssertion({ ...fixedAssertion, role: undefined }),
  );
});

test("API-key query parameters are rejected from the signed request target", () => {
  assert.throws(
    () => createSignedAppsScriptAssertion(context, {
      ...request,
      requestTarget: "/macros/s/deployment/exec?action=list&apiKey=secret",
    }),
    (error: unknown) => error instanceof Error && error.message === "The Apps Script request target is invalid.",
  );
});

test("Unicode assertion values are preserved as exact UTF-8 strings without normalization", () => {
  const composed = { ...fixedAssertion, resource: "café" };
  const decomposed = { ...fixedAssertion, resource: "cafe\u0301" };
  const canonical = canonicalizeAppsScriptAssertion(composed);
  assert.ok(canonical.includes('"café"'));
  assert.notEqual(canonical, canonicalizeAppsScriptAssertion(decomposed));
  assert.notDeepEqual(signCanonicalAssertion(composed), signCanonicalAssertion(decomposed));
});

test("empty request body uses SHA-256 of zero bytes", () => {
  assert.equal(
    sha256Body(new Uint8Array()),
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  );
});

test("generated assertions have secure unique IDs and a maximum 60-second lifetime", () => {
  const first = createSignedAppsScriptAssertion(context, request);
  const second = createSignedAppsScriptAssertion(context, request);
  assert.ok(first.jti);
  assert.notEqual(first.jti, second.jti);
  assert.equal(first.exp - first.iat, APPS_SCRIPT_ASSERTION_LIFETIME_SECONDS);
  assert.ok(first.iat > 0);
  assert.ok(first.exp > first.iat);
  assert.equal(first.bodyHash, sha256Body(request.bodyBytes));
  assert.equal(first.requestTarget, request.requestTarget);
  assert.equal(first.method, request.method);
  assert.notEqual(encodeSignedAssertion(first), encodeSignedAssertion(second));
});

test("V1 sends only the API-key header when HMAC is disabled", () => {
  const originalSecret = process.env.TUTOR_FLOW_APPS_SCRIPT_HMAC_SECRET;
  const originalEnabled = process.env.TUTOR_FLOW_APPS_SCRIPT_HMAC_ENABLED;
  delete process.env.TUTOR_FLOW_APPS_SCRIPT_HMAC_SECRET;
  delete process.env.TUTOR_FLOW_APPS_SCRIPT_HMAC_ENABLED;
  try {
    const headers = buildAppsScriptSecurityHeaders(context, request);
    assert.deepEqual(headers, {
      [APPS_SCRIPT_API_KEY_HEADER]: process.env.TUTOR_FLOW_API_KEY,
    });
  } finally {
    if (originalSecret === undefined) delete process.env.TUTOR_FLOW_APPS_SCRIPT_HMAC_SECRET;
    else process.env.TUTOR_FLOW_APPS_SCRIPT_HMAC_SECRET = originalSecret;
    if (originalEnabled === undefined) delete process.env.TUTOR_FLOW_APPS_SCRIPT_HMAC_ENABLED;
    else process.env.TUTOR_FLOW_APPS_SCRIPT_HMAC_ENABLED = originalEnabled;
  }
});

test("optional HMAC signing is enabled only by explicit configuration", () => {
  const originalEnabled = process.env.TUTOR_FLOW_APPS_SCRIPT_HMAC_ENABLED;
  process.env.TUTOR_FLOW_APPS_SCRIPT_HMAC_ENABLED = "true";
  try {
    const headers = buildAppsScriptSecurityHeaders(context, request);
    assert.deepEqual(Object.keys(headers), [APPS_SCRIPT_API_KEY_HEADER, APPS_SCRIPT_ASSERTION_HEADER]);
    assert.equal(headers[APPS_SCRIPT_API_KEY_HEADER], process.env.TUTOR_FLOW_API_KEY);
    const encodedPayload = headers[APPS_SCRIPT_ASSERTION_HEADER].split(".")[0];
    const assertionJson = Buffer.from(encodedPayload, "base64url").toString("utf8");
    assert.equal(headers[APPS_SCRIPT_ASSERTION_HEADER].split(".").length, 2);
    assert.equal(headers[APPS_SCRIPT_ASSERTION_HEADER].includes("="), false);
    assert.equal(assertionJson.includes(process.env.TUTOR_FLOW_API_KEY!), false);
    assert.equal(assertionJson.includes(process.env.TUTOR_FLOW_APPS_SCRIPT_HMAC_SECRET!), false);
    assert.equal(request.bodyBytes.some((byte) => byte === 0), false);
    assert.equal(JSON.stringify({ operation: "create" }).includes(process.env.TUTOR_FLOW_API_KEY!), false);
  } finally {
    if (originalEnabled === undefined) delete process.env.TUTOR_FLOW_APPS_SCRIPT_HMAC_ENABLED;
    else process.env.TUTOR_FLOW_APPS_SCRIPT_HMAC_ENABLED = originalEnabled;
  }
});
