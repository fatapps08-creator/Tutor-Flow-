import "server-only";

import type { Student, StudentStatus } from "@/src/types";
import { appsScriptRequest, type AppsScriptRow } from "@/src/lib/google-sheets/apps-script-client";
import { GoogleSheetsServiceError } from "@/src/lib/google-sheets/errors";
import type { StudentProfile } from "@/src/features/students/mock-data";

export type StudentProfileInput = Omit<StudentProfile, "student"> & { student: Omit<Student, "id" | "tutorId"> };

function asString(row: AppsScriptRow, key: string) { if (typeof row[key] !== "string") throw new GoogleSheetsServiceError("MALFORMED_RESPONSE", `Student field ${key} is invalid.`); return row[key] as string; }
function rowToStudent(row: AppsScriptRow): StudentProfile {
  let subjects: unknown;
  try { subjects = typeof row.subjects === "string" ? JSON.parse(row.subjects) : row.subjects; } catch { throw new GoogleSheetsServiceError("MALFORMED_RESPONSE", "Student subjects are invalid."); }
  if (!Array.isArray(subjects) || subjects.some((item) => typeof item !== "string")) throw new GoogleSheetsServiceError("MALFORMED_RESPONSE", "Student subjects are invalid.");
  const status = asString(row, "status");
  if (!["active", "inactive", "paused"].includes(status)) throw new GoogleSheetsServiceError("MALFORMED_RESPONSE", "Student status is invalid.");
  return { student: { id: asString(row, "id"), tutorId: asString(row, "tutorId"), fullName: asString(row, "fullName"), subjects, ...((row.gradeOrLevel !== undefined && row.gradeOrLevel !== "") ? { gradeOrLevel: String(row.gradeOrLevel) } : {}), ...((row.guardianName !== undefined && row.guardianName !== "") ? { guardianName: String(row.guardianName) } : {}), ...((row.guardianPhone !== undefined && row.guardianPhone !== "") ? { guardianPhone: String(row.guardianPhone) } : {}), status: status as StudentStatus, joinedDate: asString(row, "joinedDate"), ...((row.notes !== undefined && row.notes !== "") ? { notes: String(row.notes) } : {}) }, contact: { email: asString(row, "email"), dateOfBirth: asString(row, "dateOfBirth"), address: asString(row, "address") } };
}
function validate(input: StudentProfileInput) { if (!input.student.fullName.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(input.student.joinedDate)) throw new GoogleSheetsServiceError("INVALID_ARGUMENT", "Student name and valid join date are required.", 400); }
function toRow(input: StudentProfileInput): AppsScriptRow { return { ...input.student, subjects: JSON.stringify(input.student.subjects), ...input.contact }; }
export async function getStudentsForTutor(tutorId: string) { const data = await appsScriptRequest<AppsScriptRow[]>("list", "Students", { tutorId }); return (data ?? []).map(rowToStudent); }
export async function getStudentForTutor(tutorId: string, studentId: string) { const data = await appsScriptRequest<AppsScriptRow[]>("list", "Students", { tutorId, id: studentId }); const row = (data ?? []).find((item) => String(item.id) === studentId); return row ? rowToStudent(row) : undefined; }
export async function createStudentForTutor(tutorId: string, input: StudentProfileInput) { validate(input); const student = { ...input.student, id: `student-${crypto.randomUUID()}`, tutorId, fullName: input.student.fullName.trim() }; await appsScriptRequest("create", "Students", { tutorId, data: toRow({ ...input, student }) }); return { student, contact: input.contact };
}
export async function updateStudentForTutor(tutorId: string, studentId: string, input: StudentProfileInput) { validate(input); const existing = await getStudentForTutor(tutorId, studentId); if (!existing) throw new GoogleSheetsServiceError("INVALID_ARGUMENT", "The student was not found.", 404); await appsScriptRequest("update", "Students", { tutorId, id: studentId, data: toRow(input) }); return { student: { ...input.student, id: studentId, tutorId, fullName: input.student.fullName.trim() }, contact: input.contact }; }
export async function updateStudentStatusForTutor(tutorId: string, studentId: string, status: StudentStatus) { const existing = await getStudentForTutor(tutorId, studentId); if (!existing) throw new GoogleSheetsServiceError("INVALID_ARGUMENT", "The student was not found.", 404); return updateStudentForTutor(tutorId, studentId, { student: { ...existing.student, status }, contact: existing.contact }); }
