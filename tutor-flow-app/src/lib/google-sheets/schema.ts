import "server-only";

import { GoogleSheetsServiceError } from "./errors";

export const STUDENTS_SHEET_HEADERS = [
  "id", "tutorId", "fullName", "subjects", "gradeOrLevel", "guardianName",
  "guardianPhone", "status", "joinedDate", "notes", "email", "dateOfBirth", "address",
] as const;

export function validateSheetHeaders(actual: readonly string[], expected: readonly string[]) {
  if (actual.length !== expected.length || actual.some((header, index) => header !== expected[index])) {
    throw new GoogleSheetsServiceError(
      "MALFORMED_RESPONSE",
      `The worksheet headers must match the expected schema: ${expected.join(", ")}.`,
    );
  }
}
