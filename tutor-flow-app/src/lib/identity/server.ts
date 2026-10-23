import "server-only";

import { GoogleSheetsServiceError } from "@/src/lib/google-sheets/errors";
import { DevelopmentTutorIdentityProvider } from "./development-provider";
import type { TutorIdentity, TutorIdentityProvider } from "./types";

const identityProvider: TutorIdentityProvider = new DevelopmentTutorIdentityProvider();

export async function getCurrentTutor(): Promise<TutorIdentity | null> {
  return identityProvider.getCurrentTutor();
}

export async function requireCurrentTutor(): Promise<TutorIdentity> {
  const tutor = await getCurrentTutor();
  if (!tutor) {
    throw new GoogleSheetsServiceError(
      "UNAUTHORIZED",
      "A tutor identity is required to access student data.",
      401,
    );
  }
  return tutor;
}
