import Link from "next/link";
import { isDevelopmentAuthBypassEnabled } from "@/src/features/auth/config";

export const instant = false;

type LoginPageProps = {
  searchParams: Promise<{ error?: string | string[] }>;
};

const errorMessages: Record<string, string> = {
  "not-authorized": "This account is not authorized to use Tutor Flow.",
  "sign-in-failed": "We could not complete sign-in. Please try again.",
  unavailable: "Sign-in is temporarily unavailable. Please try again later.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  const errorKey = Array.isArray(error) ? error[0] : error;
  const errorMessage = errorKey ? errorMessages[errorKey] : undefined;
  const developmentBypass = isDevelopmentAuthBypassEnabled();

  return (
    <main className="page-container" style={{ maxWidth: 480, padding: "96px 24px" }}>
      <header className="page-header">
        <p className="page-eyebrow">Tutor Flow</p>
        <h1>Sign in</h1>
        <p className="page-description">
          Sign in with your Tutor Flow email and password.
        </p>
      </header>

      {errorMessage && <p role="alert">{errorMessage}</p>}

      {developmentBypass ? (
        <p role="status">
          Development authentication bypass is enabled.{" "}
          <Link className="student-button student-button-primary" href="/dashboard">
            Continue to development app
          </Link>
        </p>
      ) : (
        <form action="/api/auth/login" method="post" style={{ display: "grid", gap: 16 }}>
          <label>
            Email
            <input
              autoComplete="email"
              name="email"
              required
              style={{ display: "block", width: "100%" }}
              type="email"
            />
          </label>
          <label>
            Password
            <input
              autoComplete="current-password"
              minLength={8}
              name="password"
              required
              style={{ display: "block", width: "100%" }}
              type="password"
            />
          </label>
          <button className="student-button student-button-primary" type="submit">
            Sign in
          </button>
        </form>
      )}
    </main>
  );
}
