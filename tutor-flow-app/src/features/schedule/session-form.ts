import type { Session, SessionStatus } from "@/src/types";
import { timeToMinutes } from "@/src/features/schedule/schedule-service";

export type SessionFormValues = {
  studentId: string;
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

export function validateSessionForm(values: SessionFormValues): SessionFormErrors {
  const errors: SessionFormErrors = {};
  if (!values.studentId) errors.studentId = "sessionRequired";
  if (!values.date) errors.date = "sessionRequired";
  if (!values.subject.trim()) errors.subject = "subjectRequired";

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

export function toSessionSubmission(values: SessionFormValues): SessionSubmission {
  return {
    studentId: values.studentId,
    subject: values.subject.trim(),
    date: values.date,
    startTime: values.startTime,
    endTime: values.endTime,
    durationMinutes: Number(values.durationMinutes),
    status: values.status,
    ...(values.notes.trim() && { notes: values.notes.trim() }),
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
