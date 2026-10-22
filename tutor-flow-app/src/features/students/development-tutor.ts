import "server-only";

import { GoogleSheetsServiceError } from "@/src/lib/google-sheets/errors";

const DEVELOPMENT_TUTOR_ID = "tutor-demo";

export function getStudentsTutorId() {
  if (process.env.NODE_ENV === "production") {
    throw new GoogleSheetsServiceError(
      "CONFIGURATION",
      "Student persistence is unavailable until tutor authentication is configured.",
      503,
    );
  }

  return DEVELOPMENT_TUTOR_ID;
}
