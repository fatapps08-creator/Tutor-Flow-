import type { StudentStatus } from "@/src/types";
import { initialStudents, type StudentProfile } from "@/src/features/students/mock-data";
import {
  createStudentInApi,
  fetchStudentsFromApi,
  isStudentApiConfigurationError,
  updateStudentInApi,
  updateStudentStatusInApi,
} from "@/src/features/students/student-api-client";

export type StudentsLoadState =
  | { status: "idle" | "loading" | "loaded" }
  | { status: "error"; message: string };

const serverLoadStateSnapshot: StudentsLoadState = { status: "loading" };
let students = [...initialStudents];
let snapshot = students;
const serverSnapshot = initialStudents;
let loadState: StudentsLoadState = { status: "idle" };
let loadStateSnapshot: StudentsLoadState = loadState;
let loadPromise: Promise<void> | undefined;
const listeners = new Set<() => void>();
let useInMemoryStudents = false;

function canUseInMemoryFallback(error: unknown) {
  return process.env.NODE_ENV === "development" && isStudentApiConfigurationError(error);
}

function notify() {
  snapshot = students;
  loadStateSnapshot = loadState;
  listeners.forEach((listener) => listener());
}

function saveLoadedStudent(profile: StudentProfile, prepend = false) {
  const index = students.findIndex((item) => item.student.id === profile.student.id);
  if (index < 0 || prepend) {
    students = [profile, ...students.filter((item) => item.student.id !== profile.student.id)];
  } else {
    students = students.map((item) => (
      item.student.id === profile.student.id ? profile : item
    ));
  }
  loadState = { status: "loaded" };
  notify();
}

export function getStudentsLoadStateSnapshot() {
  return loadStateSnapshot;
}

export function getStudentsServerLoadStateSnapshot() {
  return serverLoadStateSnapshot;
}

export async function loadStudentsFromApi() {
  if (loadState.status === "loaded") return;
  if (loadPromise) return loadPromise;

  loadState = { status: "loading" };
  notify();
  loadPromise = fetchStudentsFromApi()
    .then((loadedStudents) => {
      useInMemoryStudents = false;
      students = loadedStudents;
      loadState = { status: "loaded" };
      notify();
    })
    .catch((error: unknown) => {
      if (canUseInMemoryFallback(error)) {
        useInMemoryStudents = true;
        loadState = { status: "loaded" };
        notify();
        return;
      }
      const message = error instanceof Error ? error.message : "The Students request failed.";
      loadState = { status: "error", message };
      notify();
    })
    .finally(() => {
      loadPromise = undefined;
    });
  return loadPromise;
}

export async function createStudentInSheets(profile: StudentProfile) {
  await loadStudentsFromApi();
  if (useInMemoryStudents) return createStudent(profile);
  try {
    const created = await createStudentInApi(profile);
    saveLoadedStudent(created, true);
    return created;
  } catch (error) {
    if (!canUseInMemoryFallback(error)) throw error;
    useInMemoryStudents = true;
    return createStudent(profile);
  }
}

export async function updateStudentInSheets(studentId: string, profile: StudentProfile) {
  await loadStudentsFromApi();
  if (useInMemoryStudents) return updateStudent(studentId, profile);
  try {
    const updated = await updateStudentInApi(studentId, profile);
    saveLoadedStudent(updated);
    return updated;
  } catch (error) {
    if (!canUseInMemoryFallback(error)) throw error;
    useInMemoryStudents = true;
    return updateStudent(studentId, profile);
  }
}

export async function updateStudentStatusInSheets(studentId: string, status: StudentStatus) {
  await loadStudentsFromApi();
  if (useInMemoryStudents) return updateStudentStatus(studentId, status);
  try {
    const updated = await updateStudentStatusInApi(studentId, status);
    saveLoadedStudent(updated);
    return updated;
  } catch (error) {
    if (!canUseInMemoryFallback(error)) throw error;
    useInMemoryStudents = true;
    return updateStudentStatus(studentId, status);
  }
}

export function subscribeToStudents(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getStudentsSnapshot() {
  return snapshot;
}

export function getStudentsServerSnapshot() {
  return serverSnapshot;
}

export function listStudents() {
  return students;
}

export function getStudentProfile(studentId: string) {
  return students.find((profile) => profile.student.id === studentId);
}

export function createStudent(profile: StudentProfile) {
  if (!profile.student.fullName.trim()) {
    throw new Error("A student name is required.");
  }
  if (students.some((item) => item.student.id === profile.student.id)) {
    throw new Error(`Student ${profile.student.id} already exists.`);
  }

  const created = {
    student: { ...profile.student, fullName: profile.student.fullName.trim() },
    contact: { ...profile.contact },
  };
  students = [created, ...students];
  notify();
  return created;
}

export function updateStudent(studentId: string, profile: StudentProfile) {
  const existing = getStudentProfile(studentId);
  if (!existing) {
    throw new Error(`Student ${studentId} was not found.`);
  }
  if (profile.student.id !== studentId) {
    throw new Error("A student update cannot change the student ID.");
  }
  if (!profile.student.fullName.trim()) {
    throw new Error("A student name is required.");
  }

  const updated = {
    student: {
      ...profile.student,
      tutorId: existing.student.tutorId,
      fullName: profile.student.fullName.trim(),
    },
    contact: { ...profile.contact },
  };
  students = students.map((item) => (item.student.id === studentId ? updated : item));
  notify();
  return updated;
}

export function updateStudentStatus(studentId: string, status: StudentStatus) {
  const existing = getStudentProfile(studentId);
  if (!existing) {
    throw new Error(`Student ${studentId} was not found.`);
  }

  const updated = { ...existing, student: { ...existing.student, status } };
  students = students.map((item) => (item.student.id === studentId ? updated : item));
  notify();
  return updated;
}
