import type { Session, SessionStatus } from "@/src/types";
import { initialScheduleSessions } from "@/src/features/schedule/mock-data";

export type SessionInput = Omit<Session, "id" | "tutorId">;

let sessions = [...initialScheduleSessions];
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function subscribeToSessions(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSessionsSnapshot() {
  return sessions;
}

export function getSessionsServerSnapshot() {
  return initialScheduleSessions;
}

export function createSession(input: SessionInput) {
  const session: Session = {
    ...input,
    id: `session-${crypto.randomUUID()}`,
    tutorId: "tutor-demo",
  };
  sessions = [...sessions, session];
  notify();
  return session;
}

export function updateSession(sessionId: string, input: SessionInput) {
  const existing = sessions.find((session) => session.id === sessionId);
  if (!existing) {
    throw new Error(`Session ${sessionId} was not found.`);
  }

  const updated: Session = {
    ...input,
    id: existing.id,
    tutorId: existing.tutorId,
  };
  sessions = sessions.map((session) => (
    session.id === sessionId ? updated : session
  ));
  notify();
  return updated;
}

export function updateSessionStatus(sessionId: string, status: SessionStatus) {
  const session = sessions.find((item) => item.id === sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} was not found.`);
  }

  sessions = sessions.map((item) => (
    item.id === sessionId ? { ...item, status } : item
  ));
  notify();
}

export function findSessionConflict(candidate: SessionInput, excludeId?: string) {
  const start = timeToMinutes(candidate.startTime);
  const end = timeToMinutes(candidate.endTime);

  return sessions.find((session) => {
    if (
      session.id === excludeId
      || session.date !== candidate.date
      || session.status === "cancelled"
    ) {
      return false;
    }

    const existingStart = timeToMinutes(session.startTime);
    const existingEnd = timeToMinutes(session.endTime);
    return start < existingEnd && end > existingStart;
  });
}

export function timeToMinutes(value: string) {
  const normalized = value.trim();
  const match = normalized.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return Number.NaN;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();

  if (minutes > 59 || hours > (meridiem ? 12 : 23) || hours < (meridiem ? 1 : 0)) {
    return Number.NaN;
  }
  if (meridiem === "AM" && hours === 12) hours = 0;
  if (meridiem === "PM" && hours !== 12) hours += 12;
  return hours * 60 + minutes;
}

export function formatSessionTime(value: string, language: "en" | "ms" = "en") {
  const minutes = timeToMinutes(value);
  if (!Number.isFinite(minutes)) return value;
  const date = new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60);
  return new Intl.DateTimeFormat(language === "ms" ? "ms-MY" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function toTimeInputValue(value: string) {
  const minutes = timeToMinutes(value);
  if (!Number.isFinite(minutes)) return value;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
