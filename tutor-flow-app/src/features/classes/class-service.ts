import type { Class, ClassStudent, ClassStatus } from "@/src/types";
import { initialClasses, initialClassStudents } from "@/src/features/classes/mock-data";

export type ClassInput = Pick<Class, "className" | "subject" | "description" | "status">;

let classes = [...initialClasses];
let classStudents = [...initialClassStudents];
let snapshot = { classes, classStudents };
const serverSnapshot = { classes: initialClasses, classStudents: initialClassStudents };
const listeners = new Set<() => void>();

function notify() {
  snapshot = { classes, classStudents };
  listeners.forEach((listener) => listener());
}

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function subscribeToClasses(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getClassesSnapshot() {
  return snapshot;
}

export function getClassesServerSnapshot() {
  return serverSnapshot;
}

export function createClass(input: ClassInput) {
  const record: Class = {
    ...input,
    id: createId("class"),
    tutorId: "tutor-demo",
    createdAt: new Date().toISOString(),
  };
  classes = [record, ...classes];
  notify();
  return record;
}

export function updateClass(classId: string, input: ClassInput) {
  const existing = classes.find((item) => item.id === classId);
  if (!existing) throw new Error(`Class ${classId} was not found.`);

  const updated = { ...existing, ...input };
  classes = classes.map((item) => (item.id === classId ? updated : item));
  notify();
  return updated;
}

export function updateClassStatus(classId: string, status: ClassStatus) {
  const existing = classes.find((item) => item.id === classId);
  if (!existing) throw new Error(`Class ${classId} was not found.`);

  classes = classes.map((item) => (item.id === classId ? { ...item, status } : item));
  notify();
}

export function addStudentToClass(classId: string, studentId: string) {
  const activeMembership = classStudents.find(
    (membership) => (
      membership.classId === classId
      && membership.studentId === studentId
      && membership.status === "active"
    ),
  );
  if (activeMembership) return "already-active" as const;

  const existing = classStudents.find(
    (membership) => membership.classId === classId && membership.studentId === studentId,
  );

  if (existing) {
    classStudents = classStudents.map((membership) => (
      membership.id === existing.id
        ? { ...membership, status: "active", joinedDate: new Date().toISOString().slice(0, 10) }
        : membership
    ));
    notify();
    return "reactivated" as const;
  }

  const membership: ClassStudent = {
    id: createId("class-student"),
    tutorId: "tutor-demo",
    classId,
    studentId,
    joinedDate: new Date().toISOString().slice(0, 10),
    status: "active",
  };
  classStudents = [...classStudents, membership];
  notify();
  return "added" as const;
}

export function removeStudentFromClass(membershipId: string) {
  const existing = classStudents.find((item) => item.id === membershipId);
  if (!existing) throw new Error(`Class membership ${membershipId} was not found.`);

  classStudents = classStudents.map((item) => (
    item.id === membershipId ? { ...item, status: "inactive" } : item
  ));
  notify();
}
