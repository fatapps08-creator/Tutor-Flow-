import type { Class, ClassStudent, Session, SessionStatus, SessionType } from "@/src/types";
import { timeToMinutes } from "@/src/features/schedule/schedule-service";

export type SessionFormValues = {
  type: SessionType;
  studentId: string;
  classId: string;
  subject: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: string;
  status: SessionStatus;
  notes: string;
};

export type SessionFormErrors = Partial<Record<keyof SessionFormValues, string>>;
export type SessionSubmission = Omit<Session, "id" | "tutorId">;

export function getActiveClassStudentCount(classId: string, memberships: ClassStudent[]) {
  return memberships.filter(
    (membership) => membership.classId === classId && membership.status === "active",
  ).length;
}

export function validateSessionForm(
  values: SessionFormValues,
  classes: Class[],
  memberships: ClassStudent[],
): SessionFormErrors {
  const errors: SessionFormErrors = {};
  if (!values.date) errors.date = "sessionRequired";
  if (values.type === "individual") {
    if (!values.studentId) errors.studentId = "studentRequired";
    if (!values.subject.trim()) errors.subject = "subjectRequired";
  } else {
    if (!values.classId) {
      errors.classId = "classRequired";
    } else {
      const selectedClass = classes.find((classRecord) => classRecord.id === values.classId);
      if (!selectedClass || selectedClass.status !== "active") {
        errors.classId = "classInactive";
      } else if (getActiveClassStudentCount(values.classId, memberships) === 0) {
        errors.classId = "classNoActiveStudents";
      }
    }
  }

  const start = timeToMinutes(values.startTime);
  const end = timeToMinutes(values.endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    errors.endTime = "invalidTime";
  }

  const duration = Number(values.durationMinutes);
  if (!Number.isInteger(duration) || duration < 1 || duration > 1440) {
    errors.durationMinutes = "durationRequired";
  }

  const today = new Date();
  const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (values.status === "upcoming" && values.date && values.date < todayDate) {
    errors.date = "pastDate";
  }
  if (
    values.status === "upcoming"
    && values.date === todayDate
    && Number.isFinite(start)
    && start <= today.getHours() * 60 + today.getMinutes()
  ) {
    errors.startTime = "sessionInPast";
  }

  return errors;
}

export function toSessionSubmission(
  values: SessionFormValues,
  classes: Class[],
  memberships: ClassStudent[],
): SessionSubmission {
  const sharedFields = {
    date: values.date,
    startTime: values.startTime,
    endTime: values.endTime,
    durationMinutes: Number(values.durationMinutes),
    status: values.status,
    ...(values.notes.trim() && { notes: values.notes.trim() }),
  };

  if (values.type === "individual") {
    return {
      ...sharedFields,
      type: "individual",
      studentId: values.studentId,
      subject: values.subject.trim(),
    };
  }

  const selectedClass = classes.find((classRecord) => classRecord.id === values.classId);
  if (!selectedClass || selectedClass.status !== "active") {
    throw new Error("A group session requires an active class.");
  }
  if (getActiveClassStudentCount(selectedClass.id, memberships) === 0) {
    throw new Error("A group session requires at least one active class member.");
  }

  return {
    ...sharedFields,
    type: "group",
    classId: selectedClass.id,
    subject: selectedClass.subject,
  };
}

export function timeFromMinutes(totalMinutes: number) {
  const normalized = Math.max(0, Math.min(totalMinutes, 1439));
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

export function durationBetween(startTime: string, endTime: string) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  return Number.isFinite(start) && Number.isFinite(end) && end > start ? end - start : 1;
}
