import type { StudentProfile } from "@/src/features/students/mock-data";

type StudentResponse = { student: StudentProfile };
type StudentsResponse = { students: StudentProfile[] };

export class StudentApiError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "StudentApiError";
  }
}

export function isStudentApiConfigurationError(error: unknown) {
  return error instanceof StudentApiError && error.code === "CONFIGURATION";
}

function isStudentProfile(value: unknown): value is StudentProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Partial<StudentProfile>;
  const student = profile.student;
  const contact = profile.contact;
  return Boolean(
    student
    && typeof student.id === "string"
    && typeof student.tutorId === "string"
    && typeof student.fullName === "string"
    && Array.isArray(student.subjects)
    && student.subjects.every((subject) => typeof subject === "string")
    && ["active", "inactive", "paused"].includes(student.status)
    && typeof student.joinedDate === "string"
    && contact
    && typeof contact.email === "string"
    && typeof contact.dateOfBirth === "string"
    && typeof contact.address === "string",
  );
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const errorCode = payload && typeof payload === "object"
      && "error" in payload
      && payload.error
      && typeof payload.error === "object"
      && "code" in payload.error
      && typeof payload.error.code === "string"
      ? payload.error.code
      : undefined;
    const errorMessage = payload && typeof payload === "object"
      && "error" in payload
      && payload.error
      && typeof payload.error === "object"
      && "message" in payload.error
      && typeof payload.error.message === "string"
      ? payload.error.message
      : "The student request failed.";
    throw new StudentApiError(errorMessage, errorCode, response.status);
  }
  return payload as T;
}

export async function fetchStudentsFromApi() {
  const response = await fetch("/api/students", { cache: "no-store" });
  const payload = await parseResponse<StudentsResponse>(response);
  if (!Array.isArray(payload.students) || !payload.students.every(isStudentProfile)) {
    throw new Error("The Students API returned invalid data.");
  }
  return payload.students;
}

export async function createStudentInApi(profile: StudentProfile) {
  const response = await fetch("/api/students", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  const payload = await parseResponse<StudentResponse>(response);
  if (!isStudentProfile(payload.student)) {
    throw new Error("The Students API returned invalid data.");
  }
  return payload.student;
}

export async function updateStudentInApi(studentId: string, profile: StudentProfile) {
  const response = await fetch(`/api/students/${encodeURIComponent(studentId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  const payload = await parseResponse<StudentResponse>(response);
  if (!isStudentProfile(payload.student)) {
    throw new Error("The Students API returned invalid data.");
  }
  return payload.student;
}

export async function updateStudentStatusInApi(
  studentId: string,
  status: StudentProfile["student"]["status"],
) {
  const response = await fetch(`/api/students/${encodeURIComponent(studentId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const payload = await parseResponse<StudentResponse>(response);
  if (!isStudentProfile(payload.student)) {
    throw new Error("The Students API returned invalid data.");
  }
  return payload.student;
}
