This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Google Apps Script backend

Server-side persistence uses the deployed Apps Script web app through `src/lib/google-apps-script/client.ts`. Route Handlers keep the tutor scope on the server and send `{ action, sheet, tutorId, record, id }` requests to Apps Script; no Google service-account credentials or Sheets API client are bundled in Next.js.

Configure these server-only values in local development and the deployment provider. The API key and HMAC secret are separate credentials. Never expose either through a `NEXT_PUBLIC_` variable.

```dotenv
GOOGLE_APPS_SCRIPT_URL=
TUTOR_FLOW_APPS_SCRIPT_HMAC_SECRET=
TUTOR_FLOW_API_KEY=
TUTOR_FLOW_APPS_SCRIPT_CENTER_ID=
```

### Phase 1C-B2.1 Next.js security transport

The Next.js Apps Script client now sends credentials only in `X-Tutor-Flow-Api-Key` and `X-Tutor-Flow-Assertion`. Neither credential is added to a URL, query string, or operation body. The API key is not the HMAC key. The endpoint must use HTTPS.

The server-only signing module receives trusted context from the authenticated server session (`userId` and Google `sub`), the server-configured `TUTOR_FLOW_APPS_SCRIPT_CENTER_ID`, and the server-side tutor scope used by the existing Apps Script operations. The center setting is a single deployment scope, not a membership lookup; it is temporary groundwork and does not implement B3 authorization. In the development auth bypass, the development user ID is used as `sub`. No browser-supplied identity or role is signed, and no role is currently asserted.

The assertion contains these required fields:

```text
iss, aud, jti, sub, userId, centerId, action, resource, method,
requestTarget, bodyHash, iat, exp
```

`role` and `tutorId` are optional; the current server transport includes its server-side `tutorId` and omits `role`. `iss` is `tutor-flow-nextjs`. `aud` is the configured Apps Script URL origin plus path. `jti` is a cryptographically random UUID. `iat` and `exp` are Unix seconds, with a fixed 60-second lifetime.

Canonical HMAC input is UTF-8 bytes of a compact JSON array in this exact order:

```text
[iss,aud,jti,sub,userId,centerId,action,resource,method,requestTarget,bodyHash,iat,exp,role,tutorId]
```

The implementation uses `JSON.stringify` on that explicitly constructed array; absent `role` or `tutorId` is represented as JSON `null`. Strings use JSON escaping and UTF-8 encoding; timestamps are JSON integers. The signature is `HMAC-SHA-256(TUTOR_FLOW_APPS_SCRIPT_HMAC_SECRET, canonicalBytes)`. The header value is `base64url(UTF8(JSON assertion object)).base64url(signature)` with URL-safe Base64 and no padding. The object contains the required fields and includes optional fields only when present. Apps Script must parse the object, rebuild the canonical array in the stated order, and compare the HMAC.

Canonical strings are processed exactly as supplied: there is no Unicode normalization, case folding, URL decoding, or application-level transformation. JSON uses compact `JSON.stringify` serialization with no added whitespace; quotes, backslashes, and control characters use JSON escaping, and non-ASCII characters are encoded as their exact UTF-8 bytes. The UTF-8 encoding has no BOM. Integers use JSON decimal number serialization. Apps Script must reproduce these JSON string/number rules and must not normalize or transform fields before signing.

The request target is exactly `endpoint.pathname + endpoint.search` after the client has added operation query parameters using `URL.searchParams`. That exact serialized pathname and query string are signed: parameter order and percent-encoding are significant, and the verifier must not decode, reorder, normalize, or reconstruct them. Any change to path, query value/order, encoding, or trailing slash changes the signed assertion. Query parameters are covered by `requestTarget`, not `bodyHash`.

For POST, the client serializes the operation body once to UTF-8 bytes, hashes those bytes with SHA-256 (lowercase hexadecimal `bodyHash`), and sends those same bytes. For GET, the request body is zero bytes, whose SHA-256 digest is signed. The API key is never part of the target or body. A Google Apps Script content redirect is followed only after the authenticated request, without forwarding either credential header to the redirect destination. This redirect behavior is code-reviewed but not covered by an integration test.

#### Fixed B2.1 HMAC known-answer vector

This fixed vector uses dummy test data only. It is intended for future independent verifier tests; it is not an Apps Script result.

| Field | Value |
|---|---|
| `iss` | `tutor-flow-nextjs` |
| `aud` | `https://script.google.com/macros/s/test-deployment/exec` |
| `jti` | `00000000-0000-4000-8000-000000000001` |
| `sub` | `google-subject-001` |
| `userId` | `user-001` |
| `centerId` | `center-001` |
| `action` | `create` |
| `resource` | `Students` |
| `method` | `POST` |
| `requestTarget` | `/macros/s/test-deployment/exec?action=create&sheet=Students` |
| `bodyHash` | `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad` |
| `iat` | `1790000000` |
| `exp` | `1790000060` |
| `role` | `TUTOR` |
| `tutorId` | `tutor-001` |

Dummy HMAC secret: `B2.1-known-answer-test-secret-2026`

Exact canonical JSON text (also the UTF-8 text before encoding):

```text
["tutor-flow-nextjs","https://script.google.com/macros/s/test-deployment/exec","00000000-0000-4000-8000-000000000001","google-subject-001","user-001","center-001","create","Students","POST","/macros/s/test-deployment/exec?action=create&sheet=Students","ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",1790000000,1790000060,"TUTOR","tutor-001"]
```

Exact canonical bytes as lowercase hex (UTF-8, no BOM):

```text
5b227475746f722d666c6f772d6e6578746a73222c2268747470733a2f2f7363726970742e676f6f676c652e636f6d2f6d6163726f732f732f746573742d6465706c6f796d656e742f65786563222c2230303030303030302d303030302d343030302d383030302d303030303030303030303031222c22676f6f676c652d7375626a6563742d303031222c22757365722d303031222c2263656e7465722d303031222c22637265617465222c2253747564656e7473222c22504f5354222c222f6d6163726f732f732f746573742d6465706c6f796d656e742f657865633f616374696f6e3d6372656174652673686565743d53747564656e7473222c2262613738313662663866303163666561343134313430646535646165323232336230303336316133393631373761396362343130666636316632303031356164222c313739303030303030302c313739303030303036302c225455544f52222c227475746f722d303031225d
```

Expected HMAC-SHA-256 signature:

```text
hex:     4dc9a53d8d94b1d7127c66399adcff834545ce5c9a6d087609e14b6d8a25e270
base64url: TcmlPY2UsdcSfGY5mtz_g0VFzlyabQh2CeFLbYol4nA
```

The fixed expected signature and bytes are hard-coded in `src/lib/google-apps-script/security.test.ts`; they were calculated independently of the TypeScript signing function.

The Apps Script source is external and was not present in this repository. Therefore the following verification is **required externally and is not implemented or deployed here**: verify both headers, independently reproduce canonicalization and HMAC, check issuer/audience/`iat`/`exp`, compare method/request target/body hash against the received request, and reject failures with safe machine-readable errors. A small clock-skew tolerance (for example, 5 seconds) should be applied by the verifier. Replay/idempotency storage, `LockService`, tenant/resource authorization, and cross-reference checks also remain external/future work; no Apps Script deployment was verified.

## Google authentication foundation

The app uses Google's OpenID Connect Authorization Code flow through Next.js Route Handlers. Google `sub` is the stable identity key; email is profile information only. OAuth state, nonce, and PKCE protect the callback. OAuth credentials and session encryption secrets are server-only.

Set these variables for local development and production:

```dotenv
NEXT_PUBLIC_SITE_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
AUTH_SECRET=
TUTOR_FLOW_DEV_AUTH_BYPASS=false
```

In Google Cloud, configure the authorized redirect URI as `${NEXT_PUBLIC_SITE_URL}/api/auth/google/callback`. Production must use an HTTPS site URL and production OAuth credentials. Generate `AUTH_SECRET` as a strong random value (for example, `openssl rand -base64 32`); never expose it or `GOOGLE_CLIENT_SECRET` through a `NEXT_PUBLIC_` variable.

Visit `/login` to start Google sign-in. The session is an encrypted, bounded-lifetime `HttpOnly`, `SameSite=Lax` cookie, marked `Secure` in production. No Google OAuth tokens are retained. The logout endpoint is `POST /api/auth/logout`.

No Users persistence source or Apps Script Users contract exists yet. Production therefore remains deny-all until a provisioned-user lookup is connected to that future source; Google sign-in never creates a user automatically.

To test a provisioned Google login locally, set `TUTOR_FLOW_DEV_USER_GOOGLE_SUB`, `TUTOR_FLOW_DEV_USER_ID`, `TUTOR_FLOW_DEV_USER_EMAIL`, and `TUTOR_FLOW_DEV_USER_NAME` in the server-side `.env.local` using values obtained from a trusted source. The optional `TUTOR_FLOW_DEV_USER_STATUS` defaults to `ACTIVE` and accepts `SUSPENDED` or `DISABLED` for denial testing. The configured `sub` is the only matched identity; email is profile information, not a lookup key. This allowlist is available only with `NODE_ENV=development` and is never read in production. Do not configure this user through a browser or public API. The existing `TUTOR_FLOW_DEV_AUTH_BYPASS` remains a separate development-only `tutor-demo` shortcut.

The current feature APIs are not yet protected by this authentication foundation; that work belongs to a later phase.

For local development only, set `TUTOR_FLOW_DEV_AUTH_BYPASS=true` with `NODE_ENV=development` to use the existing `tutor-demo` identity. It is ignored outside development and is not a production identity.

The Apps Script endpoint should validate its own shared-secret or authentication policy before accepting writes. User/center authorization at that boundary is not implemented in this phase.

## Center authorization data foundation (Phase 1C-A)

The server-side types and repository interfaces for Users, Centers, CenterMemberships, and Entitlements are defined under `src/features/authorization`. They define the future data and service boundary only: there is no production Users store, Apps Script implementation for these resources, client API, or feature authorization enforcement in this phase. The existing development-only Google-sub allowlist remains separate from these repositories; a later phase can connect `user-directory.ts` to `UserRepository.findByGoogleSubject()`.

The master spreadsheet is expected to contain these tabs and exact header order:

```text
Users:
userId | googleSubject | email | name | status | createdAt | updatedAt

Centers:
centerId | name | status | createdAt | updatedAt

CenterMemberships:
membershipId | userId | centerId | role | tutorId | status | createdAt | updatedAt

Entitlements:
entitlementId | centerId | plan | status | startsAt | expiresAt | purchaseReference | createdAt | updatedAt
```

The existing `Tutors` sheet keeps its current fields and `id` identifier, with `centerId` appended to the header: `id | name | email | businessName | phone | defaultLanguage | createdAt | centerId`. Each Tutor profile belongs to exactly one Center. Existing Tutor rows require an explicit migration/provisioning decision before enforcing the required value; no production default Center is inferred.

Identifiers are stable internal IDs, never row numbers or email addresses. Create-input types omit identifiers and timestamps; a future trusted server-side implementation must generate those values. Timestamps are ISO 8601 UTC strings. User status is `ACTIVE`, `SUSPENDED`, or `DISABLED`; Center status uses the same values. Membership role is `OWNER`, `ADMIN`, `TUTOR`, or `STAFF`, and membership status is `ACTIVE` or `INACTIVE`. `tutorId` is nullable for OWNER/ADMIN/STAFF and required for TUTOR. Whenever supplied, it links to a Tutor in the same Center; the Tutor link does not grant authorization. There may be at most one ACTIVE membership per `(userId, centerId)`, while inactive records remain as history.

A User may have memberships at multiple Centers. Membership is the authorization relationship; `ownerUserId` and email are not substitutes. Center is the tenant boundary. Entitlements belong to a Center, not an individual User, Tutor, or membership. Entitlement plans are `STANDARD` or `PRO`; statuses are `TRIAL`, `ACTIVE`, `EXPIRED`, `CANCELLED`, or `SUSPENDED`. Entitlement records are history and must not be deleted when superseded. At most one entitlement should be effective at a time; effective `TRIAL`/`ACTIVE` entitlement dates must include the current time. `purchaseReference` is reserved for a future integration; Stripe is not implemented.

The server-only repository interfaces express these operations without exposing arbitrary sheet reads or writes:

- `UserRepository`: find by Google `sub`, get by internal user ID, explicitly provision, and update status.
- `CenterRepository`: get by center ID, create, and update status.
- `TutorRepository`: get by Tutor ID and create a Tutor with a mandatory Center ID.
- `CenterMembershipRepository`: find active memberships for a user, get by membership ID, create, and separately update role, status, or Tutor link.
- `EntitlementRepository`: get the effective entitlement for a center and create entitlement history. Entitlement records have no update operation; lifecycle changes append a new record.

Membership create/update implementations must validate the referenced Tutor in storage and require its `centerId` to match the membership. Role updates to TUTOR require a Tutor link; unlinking a TUTOR membership is rejected until the role changes.

Record validators in `src/features/authorization/validation.ts` reject empty IDs, invalid enumerated values, malformed/non-UTC timestamps, TUTOR memberships without a Tutor link, and entitlement end dates that are not later than start dates. `isMembershipTutorInSameCenter` checks the resolved Tutor’s ID and Center. These are foundation helpers; repository implementations must apply them to untrusted persistence results and validate inputs before writes. Create/update inputs exclude server-owned identity, tenant, and timestamp fields.

These are contracts, not a live persistence implementation. `createUnavailableAuthorizationRepositories()` is an explicit fail-closed adapter boundary and rejects each operation with `AuthorizationPersistenceUnavailableError`; it does not read or write Sheets. The existing development Google-sub allowlist remains the only local authentication lookup.

### Future Apps Script contract

The Next.js client in `src/lib/google-apps-script/client.ts` supports generic `list`, `create`, `update`, and `delete` operations for existing feature sheets, scoped by the server-side tutor ID. It does not declare or implement the four authorization foundation tabs. No Apps Script source was changed.

When the Users/Center contract is implemented, use named business operations rather than browser-accessible generic sheet operations. The conceptual operations are the repository methods above: find user by Google `sub`, get user by ID, explicitly provision user, update user status; get/create center and update status; get Tutor by ID/create Tutor; find active memberships by user, get/create membership and update role/status/Tutor link; get effective center entitlement and create an entitlement period. Entitlement history has no update operation. Next.js server handlers remain the only callers. Apps Script must validate each operation and must not accept client-supplied identity as proof of authorization.

Phase 1C-B2.1 implements the Next.js signing and transport described above. The existing API key remains a separate server-to-server credential; it is not the end user's identity. Apps Script verification and deployment remain pending, so this does not complete the end-to-end B2 boundary.

For initial center context, a selected `centerId` is only a hint. The server must verify an active User, active Center, active membership, valid role, and a valid center-level `TRIAL`/`ACTIVE` entitlement whose dates include now before allowing access. Users can belong to multiple Centers, but the initial release uses one active center context at a time. The role set is intentionally limited to `OWNER`, `ADMIN`, `TUTOR`, and `STAFF`; detailed permissions remain future policy work. This policy is documented only and is not enforced across current feature APIs in Phase 1C-A.

The Students module uses the generic service through `/api/students`. Its worksheet header row must contain these columns:

```text
id | tutorId | fullName | subjects | gradeOrLevel | guardianName | guardianPhone | status | joinedDate | notes | email | dateOfBirth | address
```

The `subjects` cell is JSON text, and the additional contact columns preserve the existing Student profile form. If the development tutor has no rows, the first Students API read seeds the existing fixture profiles once; subsequent reads use the sheet. This seed check is idempotent for sequential requests, but Google Sheets does not offer an atomic insert-if-empty operation, so simultaneous cold requests across separate serverless instances could race.

This phase migrates only Students. Classes, Sessions, Attendance, Learning, Registration, Payments, and Settings remain on their existing in-memory stores.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
