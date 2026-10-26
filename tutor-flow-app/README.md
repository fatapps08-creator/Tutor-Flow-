This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Google Apps Script backend

Server-side persistence uses the deployed Apps Script web app through `src/lib/google-apps-script/client.ts`. Route Handlers keep the tutor scope on the server and send `{ action, sheet, tutorId, record, id }` requests to Apps Script; no Google service-account credentials or Sheets API client are bundled in Next.js.

Configure the server-side environment variable below in local development and the deployment provider. Do not expose it through a `NEXT_PUBLIC_` variable.

```dotenv
GOOGLE_APPS_SCRIPT_URL=
```

The Students API remains limited to the development-only `tutor-demo` identity until tutor authentication is connected. The Apps Script endpoint should validate its own shared-secret or authentication policy before accepting writes.

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
