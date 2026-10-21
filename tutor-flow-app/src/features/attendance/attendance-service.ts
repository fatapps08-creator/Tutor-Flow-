import type { Attendance, AttendanceStatus, Session } from "@/src/types";
import { initialAttendance } from "@/src/features/students/mock-data";

export type AttendanceEntry = {
  studentId: string;
  status: AttendanceStatus;
  remarks: string;
};

let attendance = [...initialAttendance];
let snapshot = attendance;
const serverSnapshot = initialAttendance;
const listeners = new Set<() => void>();

function notify() {
  snapshot = attendance;
  listeners.forEach((listener) => listener());
}

export function subscribeToAttendance(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAttendanceSnapshot() {
  return snapshot;
}

export function getAttendanceServerSnapshot() {
  return serverSnapshot;
}

export function saveSessionAttendance(session: Session, entries: AttendanceEntry[]) {
  if (entries.length === 0) {
    throw new Error("Attendance cannot be saved without students.");
  }

  const submittedStudentIds = new Set<string>();
  for (const entry of entries) {
    if (!entry.studentId || submittedStudentIds.has(entry.studentId)) {
      throw new Error("Attendance entries must contain unique student IDs.");
    }
    submittedStudentIds.add(entry.studentId);
  }

  const savedRecords = entries.map((entry) => {
    const existing = attendance.find(
      (record) => record.sessionId === session.id && record.studentId === entry.studentId,
    );
    return {
      id: existing?.id ?? `attendance-${crypto.randomUUID()}`,
      tutorId: session.tutorId,
      studentId: entry.studentId,
      sessionId: session.id,
      date: session.date,
      status: entry.status,
      ...(entry.remarks.trim() && { remarks: entry.remarks.trim() }),
    } satisfies Attendance;
  });

  const submittedKeys = new Set(
    entries.map((entry) => `${session.id}\u0000${entry.studentId}`),
  );
  const retained = attendance.filter(
    (record) => !submittedKeys.has(`${record.sessionId}\u0000${record.studentId}`),
  );
  attendance = [...retained, ...savedRecords];
  notify();
  return savedRecords;
}
