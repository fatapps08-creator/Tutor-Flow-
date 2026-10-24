import "server-only";

import type { Class, ClassStudent, ClassStatus, ClassStudentStatus } from "@/src/types";
import { appsScriptRequest } from "@/src/lib/api/apps-script-client";
import { GoogleSheetsServiceError } from "@/src/lib/google-sheets/errors";

export type ClassInput = Pick<Class, "className" | "subject" | "description" | "status">;

type Response<T> = { data?: T; classes?: Class[]; classStudents?: ClassStudent[]; class?: Class; classStudent?: ClassStudent };

function unwrap<T>(response: Response<T>, key: keyof Response<T>): T {
  const value = response[key];
  if (value === undefined) throw new GoogleSheetsServiceError("MALFORMED_RESPONSE", "The Apps Script response was incomplete.", 502);
  return value as T;
}

export async function getClassesForTutor(tutorId: string) {
  const response = await appsScriptRequest<Response<Class[]>>({ operation: "classes.list", tutorId });
  return response.classes ?? unwrap(response, "data");
}

export async function createClassForTutor(tutorId: string, input: ClassInput) {
  validateClassInput(input);
  const record = { ...input, id: `class-${crypto.randomUUID()}`, tutorId, createdAt: new Date().toISOString() } satisfies Class;
  await appsScriptRequest({ operation: "classes.create", tutorId, payload: record });
  return record;
}

export async function updateClassForTutor(tutorId: string, classId: string, input: ClassInput) {
  validateClassInput(input);
  const response = await appsScriptRequest<Response<Class>>({ operation: "classes.update", tutorId, payload: { id: classId, ...input, updatedAt: new Date().toISOString() } });
  return response.class ?? unwrap(response, "data");
}

export async function updateClassStatusForTutor(tutorId: string, classId: string, status: ClassStatus) {
  if (status !== "active" && status !== "archived") throw new GoogleSheetsServiceError("INVALID_ARGUMENT", "Invalid class status.", 400);
  const response = await appsScriptRequest<Response<Class>>({ operation: "classes.status", tutorId, payload: { id: classId, status, updatedAt: new Date().toISOString() } });
  return response.class ?? unwrap(response, "data");
}

export async function getClassStudentsForTutor(tutorId: string, classId?: string) {
  const response = await appsScriptRequest<Response<ClassStudent[]>>({ operation: "classStudents.list", tutorId, payload: classId ? { classId } : undefined });
  return response.classStudents ?? unwrap(response, "data");
}

export async function addClassStudentForTutor(tutorId: string, classId: string, studentId: string) {
  if (!classId.trim() || !studentId.trim()) throw new GoogleSheetsServiceError("INVALID_ARGUMENT", "Class and student IDs are required.", 400);
  const response = await appsScriptRequest<Response<ClassStudent>>({ operation: "classStudents.create", tutorId, payload: { id: `class-student-${crypto.randomUUID()}`, tutorId, classId, studentId, joinedDate: new Date().toISOString().slice(0, 10), status: "active" satisfies ClassStudentStatus, createdAt: new Date().toISOString() } });
  return response.classStudent ?? unwrap(response, "data");
}

export async function updateClassStudentStatusForTutor(tutorId: string, membershipId: string, status: ClassStudentStatus) {
  const response = await appsScriptRequest<Response<ClassStudent>>({ operation: "classStudents.status", tutorId, payload: { id: membershipId, status, updatedAt: new Date().toISOString() } });
  return response.classStudent ?? unwrap(response, "data");
}

function validateClassInput(input: ClassInput) {
  if (!input.className.trim() || !input.subject.trim()) throw new GoogleSheetsServiceError("INVALID_ARGUMENT", "Class name and subject are required.", 400);
  if (input.status !== "active" && input.status !== "archived") throw new GoogleSheetsServiceError("INVALID_ARGUMENT", "Invalid class status.", 400);
}
