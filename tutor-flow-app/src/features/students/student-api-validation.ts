import "server-only";

import { GoogleSheetsServiceError } from "@/src/lib/google-sheets/errors";
import type { StudentProfileInput } from "@/src/features/students/student-repository";
import type { StudentStatus } from "@/src/types";

function isStudentStatus(value: unknown): value is StudentStatus {
  return value === "active" || value === "inactive" || value === "paused";
}

export async function readStudentRequestBody(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new GoogleSheetsServiceError("INVALID_ARGUMENT", "The request body must contain valid JSON.", 400);
  }
}

export function parseStudentInput(value: unknown): StudentProfileInput {
  if (!value || typeof value !== "object") {
    throw new GoogleSheetsServiceError("INVALID_ARGUMENT", "Student data is required.", 400);
  }
  const payload = value as Record<string, unknown>;
  if (!payload.student || typeof payload.student !== "object"
    || !payload.contact || typeof payload.contact !== "object") {
    throw new GoogleSheetsServiceError("INVALID_ARGUMENT", "Student data is invalid.", 400);
  }

  const student = payload.student as Record<string, unknown>;
  const contact = payload.contact as Record<string, unknown>;
  if (
    typeof student.fullName !== "string"
    || !Array.isArray(student.subjects)
    || student.subjects.some((subject) => typeof subject !== "string")
    || !isStudentStatus(student.status)
    || typeof student.joinedDate !== "string"
    || ["gradeOrLevel", "guardianName", "guardianPhone", "notes"].some(
      (field) => student[field] !== undefined && typeof student[field] !== "string",
    )
    || ["email", "dateOfBirth", "address"].some(
      (field) => typeof contact[field] !== "string",
    )
  ) {
    throw new GoogleSheetsServiceError("INVALID_ARGUMENT", "Student data is invalid.", 400);
  }

  return {
    student: {
      fullName: student.fullName,
      subjects: student.subjects,
      ...(typeof student.gradeOrLevel === "string" && { gradeOrLevel: student.gradeOrLevel }),
      ...(typeof student.guardianName === "string" && { guardianName: student.guardianName }),
      ...(typeof student.guardianPhone === "string" && { guardianPhone: student.guardianPhone }),
      status: student.status,
      joinedDate: student.joinedDate,
      ...(typeof student.notes === "string" && { notes: student.notes }),
    },
    contact: {
      email: contact.email as string,
      dateOfBirth: contact.dateOfBirth as string,
      address: contact.address as string,
    },
  };
}
