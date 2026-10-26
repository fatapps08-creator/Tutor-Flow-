import "server-only";

import type { Student, StudentStatus } from "@/src/types";
import {
  appendRows,
  deleteRow,
  findRows,
  readRows,
  updateRow,
  type GoogleSheetRow,
} from "@/src/lib/google-sheets/service";
import { GOOGLE_SHEET_TABS } from "@/src/lib/google-sheets/tabs";
import { GoogleSheetsServiceError } from "@/src/lib/google-sheets/errors";
import type { StudentProfile } from "@/src/features/students/mock-data";

export type StudentProfileInput = Omit<StudentProfile, "student"> & {
  student: Omit<Student, "id" | "tutorId">;
};

function stringValue(row: GoogleSheetRow, field: string) {
  const value = row[field];
  if (typeof value !== "string") {
    throw new GoogleSheetsServiceError(
      "MALFORMED_RESPONSE",
      `A student row has an invalid ${field} value.`,
    );
  }
  return value;
}

function optionalString(row: GoogleSheetRow, field: string) {
  const value = stringValue(row, field).trim();
  return value || undefined;
}

function studentFieldsToRow(profile: StudentProfile): GoogleSheetRow {
  return {
    fullName: profile.student.fullName,
    subjects: JSON.stringify(profile.student.subjects),
    gradeOrLevel: profile.student.gradeOrLevel ?? "",
    guardianName: profile.student.guardianName ?? "",
    guardianPhone: profile.student.guardianPhone ?? "",
    status: profile.student.status,
    joinedDate: profile.student.joinedDate,
    notes: profile.student.notes ?? "",
    email: profile.contact.email,
    dateOfBirth: profile.contact.dateOfBirth,
    address: profile.contact.address,
  };
}

export function studentToRow(profile: StudentProfile, tutorId: string): GoogleSheetRow {
  return {
    id: profile.student.id,
    tutorId,
    ...studentFieldsToRow(profile),
  };
}

export function rowToStudent(row: GoogleSheetRow): StudentProfile {
  const rawSubjects = stringValue(row, "subjects");
  let subjects: unknown;
  try {
    subjects = JSON.parse(rawSubjects);
  } catch {
    throw new GoogleSheetsServiceError(
      "MALFORMED_RESPONSE",
      "A student row has invalid serialized subjects.",
    );
  }
  if (!Array.isArray(subjects) || subjects.some((subject) => typeof subject !== "string")) {
    throw new GoogleSheetsServiceError(
      "MALFORMED_RESPONSE",
      "A student row has invalid serialized subjects.",
    );
  }

  const status = stringValue(row, "status");
  if (status !== "active" && status !== "inactive" && status !== "paused") {
    throw new GoogleSheetsServiceError("MALFORMED_RESPONSE", "A student row has an invalid status.");
  }
  const tutorId = stringValue(row, "tutorId");

  return {
    student: {
      id: stringValue(row, "id"),
      tutorId,
      fullName: stringValue(row, "fullName"),
      subjects,
      ...(optionalString(row, "gradeOrLevel") && { gradeOrLevel: optionalString(row, "gradeOrLevel") }),
      ...(optionalString(row, "guardianName") && { guardianName: optionalString(row, "guardianName") }),
      ...(optionalString(row, "guardianPhone") && { guardianPhone: optionalString(row, "guardianPhone") }),
      status,
      joinedDate: stringValue(row, "joinedDate"),
      ...(optionalString(row, "notes") && { notes: optionalString(row, "notes") }),
    },
    contact: {
      email: stringValue(row, "email"),
      dateOfBirth: stringValue(row, "dateOfBirth"),
      address: stringValue(row, "address"),
    },
  };
}

function validateStudent(profile: StudentProfileInput) {
  if (!profile.student.fullName.trim()) {
    throw new GoogleSheetsServiceError("INVALID_ARGUMENT", "A student name is required.", 400);
  }
  if (!Array.isArray(profile.student.subjects)
    || profile.student.subjects.some((subject) => typeof subject !== "string")) {
    throw new GoogleSheetsServiceError("INVALID_ARGUMENT", "Student subjects must be a list of text values.", 400);
  }
  if (!["active", "inactive", "paused"].includes(profile.student.status)) {
    throw new GoogleSheetsServiceError("INVALID_ARGUMENT", "Choose a valid student status.", 400);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(profile.student.joinedDate)) {
    throw new GoogleSheetsServiceError("INVALID_ARGUMENT", "A valid student join date is required.", 400);
  }
  for (const field of ["email", "dateOfBirth", "address"] as const) {
    if (typeof profile.contact[field] !== "string") {
      throw new GoogleSheetsServiceError("INVALID_ARGUMENT", "Student contact details are invalid.", 400);
    }
  }
}

export async function getStudentsForTutor(tutorId: string) {
  const rows = await readRows(GOOGLE_SHEET_TABS.students, tutorId);
  const profiles = rows.map(rowToStudent);
  const studentIds = new Set<string>();
  for (const { student } of profiles) {
    if (studentIds.has(student.id)) {
      throw new GoogleSheetsServiceError(
        "MALFORMED_RESPONSE",
        "A student ID appears more than once in the Students worksheet.",
      );
    }
    studentIds.add(student.id);
  }
  return profiles;
}

export async function getStudentForTutor(tutorId: string, studentId: string) {
  if (!studentId.trim()) {
    throw new GoogleSheetsServiceError("INVALID_ARGUMENT", "A student ID is required.", 400);
  }
  const rows = await findRows(GOOGLE_SHEET_TABS.students, tutorId, { id: studentId });
  if (rows.length > 1) {
    throw new GoogleSheetsServiceError(
      "MALFORMED_RESPONSE",
      "The student ID appears more than once in the Students worksheet.",
    );
  }
  return rows[0] ? rowToStudent(rows[0]) : undefined;
}

export async function createStudentForTutor(tutorId: string, input: StudentProfileInput) {
  validateStudent(input);
  let studentId = "";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const candidate = `student-${crypto.randomUUID()}`;
    if ((await findRows(GOOGLE_SHEET_TABS.students, tutorId, { id: candidate })).length === 0) {
      studentId = candidate;
      break;
    }
  }
  if (!studentId) {
    throw new GoogleSheetsServiceError("API_ERROR", "A unique student ID could not be generated.", 500);
  }

  const profile: StudentProfile = {
    student: {
      ...input.student,
      id: studentId,
      tutorId,
      fullName: input.student.fullName.trim(),
    },
    contact: { ...input.contact },
  };
  await appendRows(GOOGLE_SHEET_TABS.students, tutorId, [studentToRow(profile, tutorId)]);
  return profile;
}

export async function updateStudentForTutor(
  tutorId: string,
  studentId: string,
  input: StudentProfileInput,
) {
  validateStudent(input);
  const existing = await getStudentForTutor(tutorId, studentId);
  if (!existing) {
    throw new GoogleSheetsServiceError("INVALID_ARGUMENT", "The student was not found.", 404);
  }
  const updated: StudentProfile = {
    student: {
      ...input.student,
      id: studentId,
      tutorId,
      fullName: input.student.fullName.trim(),
    },
    contact: { ...input.contact },
  };
  await updateRow(
    GOOGLE_SHEET_TABS.students,
    tutorId,
    studentId,
    studentFieldsToRow(updated),
  );
  return updated;
}

export async function deleteStudentForTutor(tutorId: string, studentId: string) {
  const existing = await getStudentForTutor(tutorId, studentId);
  if (!existing) {
    throw new GoogleSheetsServiceError("INVALID_ARGUMENT", "The student was not found.", 404);
  }

  await deleteRow(GOOGLE_SHEET_TABS.students, tutorId, studentId);
}

export async function updateStudentStatusForTutor(
  tutorId: string,
  studentId: string,
  status: StudentStatus,
) {
  const existing = await getStudentForTutor(tutorId, studentId);
  if (!existing) {
    throw new GoogleSheetsServiceError("INVALID_ARGUMENT", "The student was not found.", 404);
  }
  return updateStudentForTutor(tutorId, studentId, {
    student: { ...existing.student, status },
    contact: existing.contact,
  });
}
