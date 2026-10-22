This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Google Sheets foundation

Google Sheets access is server-only and uses the official `googleapis` package. The shared service lives in `src/lib/google-sheets/`; its modules import `server-only`, so they cannot be imported into client components. Future Next.js Route Handlers should call this service and derive `tutorId` from a trusted server-side identity. Do not accept a tutor ID as an authorization claim from the browser. The Students API is currently limited to a development-only `tutor-demo` identity and is disabled in production until authentication can provide a trusted identity; no other module has a Sheets API.

Create a Google service account, enable the Google Sheets API, and share the target spreadsheet with the service account email. Add the following server-side environment variables to `.env.local` for local development and to the deployment provider's server environment settings:

```dotenv
GOOGLE_CLIENT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SHEET_ID=
```

The private key may be supplied with literal newlines or escaped `\n` sequences. Keep these values private: do not add real credentials to `.env.example`, source code, browser-exposed `NEXT_PUBLIC_` variables, or Git. The app `.gitignore` excludes environment files while explicitly allowing the empty `.env.example`.

The tab names are centralized in `src/lib/google-sheets/tabs.ts` and match `GoogleSheetTabName`. Create the required worksheet tabs and a header row before using the generic service. Each worksheet must include unique column headers and a `tutorId` column; updating a row also requires an `id` column. The service does not create tabs, headers, or sample data. Operations require an explicit tutor ID and scope reads/updates on the server.

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
