"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session, SessionStatus, Student } from "@/src/types";
import { initialStudents } from "@/src/features/students/mock-data";
import { SessionFormModal } from "@/src/components/schedule/session-form-modal";
import { ScheduleList } from "@/src/components/schedule/schedule-list";
import { Icon } from "@/src/components/ui/icon";
import { getTranslations } from "@/src/i18n";
import {
  createSession,
  findSessionConflict,
  formatSessionTime,
  timeToMinutes,
  updateSession,
  updateSessionStatus,
} from "@/src/features/schedule/schedule-service";
import type { SessionFormValues } from "@/src/features/schedule/session-form";
import { toSessionSubmission } from "@/src/features/schedule/session-form";
import { useSessions } from "@/src/features/schedule/use-sessions";
import { useCurrentMinute, useTodayDate } from "@/src/features/schedule/use-today";

type ScheduleView = "today" | "upcoming" | "week";

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function mondayOf(date: Date) {
  const monday = new Date(date);
  const day = monday.getDay();
  monday.setDate(monday.getDate() + (day === 0 ? -6 : 1 - day));
  monday.setHours(12, 0, 0, 0);
  return monday;
}

function shiftDate(date: Date, amount: number) {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + amount);
  return shifted;
}

function sortSessions(items: Session[]) {
  return [...items].sort((a, b) => (
    a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)
  ));
}

function formatDate(date: Date, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    ...options,
  }).format(date);
}

export function ScheduleManager() {
  const t = getTranslations();
  const sessions = useSessions();
  const todayKey = useTodayDate();
  const currentMinute = useCurrentMinute();
  const [year, month, day] = todayKey.split("-").map(Number);
  const today = new Date(year, month - 1, day, 12);
  const [view, setView] = useState<ScheduleView>("today");
  const [weekAnchor, setWeekAnchor] = useState(today);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Session>();
  const [conflict, setConflict] = useState<Session>();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string }>();

  const students = useMemo<Student[]>(
    () => initialStudents.map(({ student }) => student).filter((student) => student.status !== "inactive"),
    [],
  );
  const studentsById = useMemo(
    () => new Map(students.map((student) => [student.id, student])),
    [students],
  );
  const sorted = useMemo(() => sortSessions(sessions), [sessions]);
  const todaysSessions = sorted.filter((session) => session.date === todayKey);
  const upcomingSessions = sorted.filter(
    (session) => (
      session.status === "upcoming"
      && (
        session.date > todayKey
        || (session.date === todayKey && timeToMinutes(session.startTime) > currentMinute)
      )
    ),
  );
  const weekStart = mondayOf(weekAnchor);
  const weekDays = Array.from({ length: 7 }, (_, index) => shiftDate(weekStart, index));
  const weekEndKey = dateKey(weekDays[6]);
  const weeklySessions = sorted.filter(
    (session) => session.date >= dateKey(weekStart) && session.date <= weekEndKey,
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => setLoading(false), 220);
    return () => window.clearTimeout(timeout);
  }, []);

  function closeModal() {
    setModalOpen(false);
    setEditing(undefined);
    setConflict(undefined);
  }

  function openCreate() {
    setEditing(undefined);
    setConflict(undefined);
    setFeedback(undefined);
    setModalOpen(true);
  }

  function openEdit(session: Session) {
    setEditing(session);
    setConflict(undefined);
    setFeedback(undefined);
    setModalOpen(true);
  }

  async function saveSession(values: SessionFormValues, allowConflict: boolean) {
    const input = toSessionSubmission(values);
    const existingConflict = findSessionConflict(input, editing?.id);
    if (existingConflict && !allowConflict) {
      setConflict(existingConflict);
      throw new Error("SCHEDULE_CONFLICT");
    }

    try {
      if (editing) {
        updateSession(editing.id, input);
        setFeedback({ type: "success", message: t.sessionUpdated });
      } else {
        createSession(input);
        setFeedback({ type: "success", message: t.sessionAdded });
      }
      closeModal();
    } catch (error) {
      if (error instanceof Error && error.message === "SCHEDULE_CONFLICT") throw error;
      setFeedback({ type: "error", message: t.sessionSaveFailed });
      throw error;
    }
  }

  function changeStatus(session: Session, status: SessionStatus) {
    if (status === "cancelled" && !window.confirm(`${t.cancelSessionConfirmation}\n\n${studentsById.get(session.studentId)?.fullName ?? t.student}`)) {
      return;
    }

    try {
      updateSessionStatus(session.id, status);
      const message = status === "cancelled"
        ? t.sessionCancelled
        : status === "completed"
          ? t.sessionCompleted
          : t.sessionNoShow;
      setFeedback({ type: "success", message });
    } catch {
      setFeedback({ type: "error", message: t.sessionUpdateFailed });
    }
  }

  const viewTitles: Record<ScheduleView, string> = {
    today: t.todayScheduleTitle,
    upcoming: t.upcomingScheduleTitle,
    week: t.weeklyScheduleTitle,
  };

  return (
    <>
      <div className="page-container schedule-page">
        <header className="page-header schedule-page-header">
          <div>
            <p className="page-eyebrow">{t.dashboardOverview}</p>
            <h1>{t.schedule}</h1>
            <p className="page-description">{t.scheduleDescription}</p>
          </div>
          <button className="student-button student-button-primary schedule-create-button" type="button" onClick={openCreate}>
            <Icon name="plus" />
            {t.newSession}
          </button>
        </header>

        {feedback && (
          <div
            className={`student-feedback feedback-${feedback.type}`}
            role={feedback.type === "error" ? "alert" : "status"}
          >
            <Icon name={feedback.type === "success" ? "check" : "clipboard"} />
            <span>{feedback.message}</span>
            <button type="button" onClick={() => setFeedback(undefined)} aria-label={t.close}>
              <Icon name="close" />
            </button>
          </div>
        )}

        <section className="schedule-panel" aria-label={t.schedule} aria-busy={loading}>
          <div className="schedule-panel-toolbar">
            <div className="schedule-view-tabs" role="tablist" aria-label={t.schedule}>
              {([
                ["today", t.today, todaysSessions.length],
                ["upcoming", t.upcoming, upcomingSessions.length],
                ["week", t.week, weeklySessions.length],
              ] as const).map(([key, label, count]) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={view === key}
                  className={`schedule-view-tab${view === key ? " is-active" : ""}`}
                  key={key}
                  onClick={() => setView(key)}
                >
                  {label}<span>{count}</span>
                </button>
              ))}
            </div>
            {view === "week" ? (
              <div className="schedule-week-controls">
                <span>{formatDate(weekStart, { month: "short", day: "numeric" })} – {formatDate(weekDays[6], { month: "short", day: "numeric", weekday: undefined })}</span>
                <button
                  type="button"
                  onClick={() => setWeekAnchor((date) => shiftDate(date, -7))}
                  aria-label={t.previousWeek}
                >
                  <Icon name="arrowLeft" />
                </button>
                <button
                  type="button"
                  onClick={() => setWeekAnchor((date) => shiftDate(date, 7))}
                  aria-label={t.nextWeek}
                >
                  <Icon name="arrowRight" />
                </button>
                {dateKey(weekStart) !== dateKey(mondayOf(today)) && (
                  <button
                    type="button"
                    className="schedule-this-week"
                    onClick={() => setWeekAnchor(today)}
                  >
                    {t.thisWeek}
                  </button>
                )}
              </div>
            ) : (
              <p className="schedule-today-date">{formatDate(today)}</p>
            )}
          </div>

          {loading ? (
            <div className="students-loading" role="status">
              <span className="student-loading-spinner" aria-hidden="true" />
              <span>{t.loadingSchedule}</span>
            </div>
          ) : view === "week" && weeklySessions.length === 0 ? (
            <div className="schedule-empty-state">
              <span className="schedule-empty-icon"><Icon name="calendar" /></span>
              <h2>{t.noWeeklySessionsTitle}</h2>
              <p>{t.noWeeklySessionsDescription}</p>
              <button className="student-button student-button-primary" type="button" onClick={openCreate}>
                <Icon name="plus" />{t.createFirstSession}
              </button>
            </div>
          ) : view === "week" ? (
            <div className="schedule-week-grid">
              {weekDays.map((day) => {
                const key = dateKey(day);
                const daySessions = sorted.filter((session) => session.date === key);
                const isToday = key === todayKey;
                return (
                  <section className={`schedule-week-day${isToday ? " is-today" : ""}`} key={key}>
                    <div className="schedule-week-day-heading" aria-current={isToday ? "date" : undefined}>
                      <span>{formatDate(day, { weekday: "short" })}</span>
                      <strong>{day.getDate()}</strong>
                      {isToday && <em>{t.today}</em>}
                    </div>
                    {daySessions.length > 0 ? (
                      <div className="schedule-week-day-sessions">
                        {daySessions.map((session) => (
                          <button
                            className={`schedule-week-session status-${session.status}`}
                            type="button"
                            key={session.id}
                            onClick={() => openEdit(session)}
                          >
                            <strong>{formatSessionTime(session.startTime)}</strong>
                            <span>{studentsById.get(session.studentId)?.fullName ?? t.student}</span>
                            <small>{session.subject}</small>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="schedule-week-no-session">—</span>
                    )}
                  </section>
                );
              })}
            </div>
          ) : (
            <>
              <div className="schedule-list-heading">
                <div>
                  <span className="schedule-list-date-indicator" />
                  <h2>{viewTitles[view]}</h2>
                </div>
                <span>{(view === "today" ? todaysSessions : upcomingSessions).length} {t.sessions}</span>
              </div>
              <div className="schedule-panel-content">
                <ScheduleList
                  sessions={view === "today" ? todaysSessions : upcomingSessions}
                  studentsById={studentsById}
                  onCreate={openCreate}
                  onEdit={openEdit}
                  onStatusChange={changeStatus}
                  emptyTitle={view === "today" ? t.noSessionsToday : t.noUpcomingSessionsTitle}
                  emptyDescription={view === "today" ? t.noSessionsTodayDescription : t.noUpcomingSessionsDescription}
                />
              </div>
            </>
          )}
        </section>
      </div>

      {modalOpen && (
        <SessionFormModal
          key={editing?.id ?? "new-session"}
          students={students}
          session={editing}
          today={todayKey}
          conflict={conflict}
          setConflict={setConflict}
          onClose={closeModal}
          onSave={saveSession}
        />
      )}
    </>
  );
}
