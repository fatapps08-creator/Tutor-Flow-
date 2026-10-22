import type { Registration, RegistrationType } from "@/src/types";
import { addStudentToClass, getClassesSnapshot } from "@/src/features/classes/class-service";
import { initialRegistrations } from "@/src/features/registration/mock-data";
import {
  createStudent,
  getStudentProfile,
} from "@/src/features/students/student-service";
import type { StudentProfile } from "@/src/features/students/mock-data";

export type RegistrationInput = {
  studentName: string;
  requestedSubject: string;
  registrationType: RegistrationType;
  guardianName?: string;
  guardianPhone?: string;
  preferredSchedule?: string;
  preferredClassId?: string;
  notes?: string;
};

let registrations = [...initialRegistrations];
let snapshot = registrations;
const serverSnapshot = initialRegistrations;
const listeners = new Set<() => void>();

function notify() {
  snapshot = registrations;
  listeners.forEach((listener) => listener());
}

function cleanOptional(value?: string) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function validateInput(input: RegistrationInput) {
  if (!input.studentName.trim()) {
    throw new Error("A student name is required.");
  }
  if (!input.requestedSubject.trim()) {
    throw new Error("A requested subject is required.");
  }
  if (input.registrationType !== "individual" && input.registrationType !== "group") {
    throw new Error("A valid registration type is required.");
  }
  if (input.registrationType === "group") {
    const selectedClass = getClassesSnapshot().classes.find(
      (classRecord) => classRecord.id === input.preferredClassId,
    );
    if (!selectedClass || selectedClass.status !== "active") {
      throw new Error("Choose an active class for a group registration.");
    }
  }
}

function toRegistrationInput(input: RegistrationInput): RegistrationInput {
  const selectedClass = input.registrationType === "group"
    ? getClassesSnapshot().classes.find((item) => item.id === input.preferredClassId)
    : undefined;
  return {
    studentName: input.studentName.trim(),
    requestedSubject: selectedClass?.subject ?? input.requestedSubject.trim(),
    registrationType: input.registrationType,
    ...(cleanOptional(input.guardianName) && { guardianName: cleanOptional(input.guardianName) }),
    ...(cleanOptional(input.guardianPhone) && { guardianPhone: cleanOptional(input.guardianPhone) }),
    ...(cleanOptional(input.preferredSchedule) && { preferredSchedule: cleanOptional(input.preferredSchedule) }),
    ...(input.registrationType === "group" && input.preferredClassId
      ? { preferredClassId: input.preferredClassId }
      : {}),
    ...(cleanOptional(input.notes) && { notes: cleanOptional(input.notes) }),
  };
}

export function subscribeToRegistrations(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getRegistrationsSnapshot() {
  return snapshot;
}

export function getRegistrationsServerSnapshot() {
  return serverSnapshot;
}

export function listRegistrations() {
  return registrations;
}

export function createRegistration(input: RegistrationInput) {
  validateInput(input);
  const values = toRegistrationInput(input);
  const selectedClass = values.preferredClassId
    ? getClassesSnapshot().classes.find((item) => item.id === values.preferredClassId)
    : undefined;
  const registration: Registration = {
    ...values,
    id: `registration-${crypto.randomUUID()}`,
    tutorId: selectedClass?.tutorId ?? "tutor-demo",
    status: "pending",
    submittedAt: new Date().toISOString(),
  };
  registrations = [registration, ...registrations];
  notify();
  return registration;
}

export function updateRegistration(registrationId: string, input: RegistrationInput) {
  validateInput(input);
  const existing = registrations.find((item) => item.id === registrationId);
  if (!existing) {
    throw new Error(`Registration ${registrationId} was not found.`);
  }

  const values = toRegistrationInput(input);
  const selectedClass = values.preferredClassId
    ? getClassesSnapshot().classes.find((item) => item.id === values.preferredClassId)
    : undefined;
  const updated: Registration = {
    ...existing,
    ...values,
    ...(values.registrationType === "individual" ? { preferredClassId: undefined } : {}),
    tutorId: selectedClass?.tutorId ?? existing.tutorId,
  };
  registrations = registrations.map((item) => (item.id === registrationId ? updated : item));
  notify();
  return updated;
}

export function rejectRegistration(registrationId: string) {
  const existing = registrations.find((item) => item.id === registrationId);
  if (!existing) {
    throw new Error(`Registration ${registrationId} was not found.`);
  }
  if (existing.status !== "pending") {
    throw new Error("Only pending registrations can be rejected.");
  }

  const updated = { ...existing, status: "rejected" as const };
  registrations = registrations.map((item) => (item.id === registrationId ? updated : item));
  notify();
  return updated;
}

export function approveRegistration(registrationId: string): {
  registration: Registration;
  profile: StudentProfile;
} {
  const existing = registrations.find((item) => item.id === registrationId);
  if (!existing) {
    throw new Error(`Registration ${registrationId} was not found.`);
  }

  if (existing.status === "approved") {
    const profile = existing.createdStudentId
      ? getStudentProfile(existing.createdStudentId)
      : undefined;
    if (!profile) {
      throw new Error("The approved registration has no linked student profile.");
    }
    return { registration: existing, profile };
  }
  if (existing.status !== "pending") {
    throw new Error("Only pending registrations can be approved.");
  }

  const selectedClass = existing.registrationType === "group"
    ? getClassesSnapshot().classes.find((item) => item.id === existing.preferredClassId)
    : undefined;
  if (existing.registrationType === "group" && (!selectedClass || selectedClass.status !== "active")) {
    throw new Error("The selected class is no longer active.");
  }

  const studentId = `student-registration-${existing.id}`;
  let profile = getStudentProfile(studentId);
  if (!profile) {
    const subject = selectedClass?.subject ?? existing.requestedSubject;
    profile = createStudent({
      student: {
        id: studentId,
        tutorId: existing.tutorId,
        fullName: existing.studentName,
        subjects: [subject],
        ...(existing.guardianName && { guardianName: existing.guardianName }),
        ...(existing.guardianPhone && { guardianPhone: existing.guardianPhone }),
        status: "active",
        joinedDate: new Date().toISOString().slice(0, 10),
        ...(existing.notes && { notes: existing.notes }),
      },
      contact: { email: "", dateOfBirth: "", address: "" },
    });
  }

  if (selectedClass) {
    addStudentToClass(selectedClass.id, profile.student.id);
  }

  const updated: Registration = {
    ...existing,
    status: "approved",
    createdStudentId: profile.student.id,
  };
  registrations = registrations.map((item) => (item.id === registrationId ? updated : item));
  notify();
  return { registration: updated, profile };
}
