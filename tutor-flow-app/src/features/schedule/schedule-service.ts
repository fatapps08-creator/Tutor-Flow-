import type { Session, SessionStatus } from "@/src/types";
import { initialScheduleSessions } from "@/src/features/schedule/mock-data";

export type SessionInput = Omit<Session, "id" | "tutorId">;

type SessionStore = {
  sessions: Session[];
  listeners: Set<() => void>;
};

type SessionStoreWindow = Window & {
  __tutorFlowSessionStore?: SessionStore;
};

function createSessionStore(): SessionStore {
  return {
    sessions: [...initialScheduleSessions],
    listeners: new Set(),
  };
}

const serverStore = createSessionStore();

function getSessionStore() {
  if (typeof window === "undefined") {
    return serverStore;
  }

  const clientWindow = window as SessionStoreWindow;
  if (!clientWindow.__tutorFlowSessionStore) {
    clientWindow.__tutorFlowSessionStore = createSessionStore();
  }
  return clientWindow.__tutorFlowSessionStore;
}

function notify(store: SessionStore) {
  store.listeners.forEach((listener) => listener());
}

export function subscribeToSessions(listener: () => void) {
  const store = getSessionStore();
  store.listeners.add(listener);
  return () => store.listeners.delete(listener);
}

export function getSessionsSnapshot() {
  return getSessionStore().sessions;
}

export function getSessionsServerSnapshot() {
  return initialScheduleSessions;
}

export function createSession(input: SessionInput) {
  const store = getSessionStore();
  const session: Session = {
    ...input,
    id: `session-${crypto.randomUUID()}`,
    tutorId: "tutor-demo",
  };
  store.sessions = [...store.sessions, session];
  notify(store);
  return session;
}

export function updateSession(sessionId: string, input: SessionInput) {
  const store = getSessionStore();
  const existing = store.sessions.find((session) => session.id === sessionId);
  if (!existing) {
    throw new Error(`Session ${sessionId} was not found.`);
  }

  const updated: Session = {
    ...input,
    id: existing.id,
    tutorId: existing.tutorId,
  };
  store.sessions = store.sessions.map((session) => (
    session.id === sessionId ? updated : session
  ));
  notify(store);
  return updated;
}

export function updateSessionStatus(sessionId: string, status: SessionStatus) {
  const store = getSessionStore();
  const session = store.sessions.find((item) => item.id === sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} was not found.`);
  }

  const updated = { ...session, status };
  store.sessions = store.sessions.map((item) => item.id === sessionId ? updated : item);
  notify(store);
}

export function findSessionConflict(candidate: SessionInput, excludeId?: string) {
  const start = timeToMinutes(candidate.startTime);
  const end = timeToMinutes(candidate.endTime);

  return getSessionStore().sessions.find((session) => {
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
