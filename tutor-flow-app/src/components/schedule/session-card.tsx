"use client";

import type { MouseEvent } from "react";
import type { Class, Session, SessionStatus, Student } from "@/src/types";
import { formatSessionTime } from "@/src/features/schedule/schedule-service";
import { Icon } from "@/src/components/ui/icon";
import { getTranslations } from "@/src/i18n";

type SessionCardProps = {
  session: Session;
  student?: Student;
  classRecord?: Class;
  activeStudentCount?: number;
  onEdit: (session: Session) => void;
  onStatusChange: (session: Session, status: SessionStatus) => void;
};

function StatusLabel({ status }: { status: SessionStatus }) {
  const t = getTranslations();
  const label = status === "no_show" ? t.noShow : t[status];
  return (
    <span className={`schedule-status schedule-status-${status}`}>
      <span className="schedule-status-dot" />
      {label}
    </span>
  );
}

export function SessionCard({
  session,
  student,
  classRecord,
  activeStudentCount,
  onEdit,
  onStatusChange,
}: SessionCardProps) {
  const t = getTranslations();
  const canUpdateStatus = session.status === "upcoming";
  const groupSession = session.type === "group";
  const sessionName = groupSession ? classRecord?.className ?? t.groupClass : student?.fullName ?? t.student;

  function closeMenu(event: MouseEvent<HTMLButtonElement>) {
    event.currentTarget.closest("details")?.removeAttribute("open");
  }

  return (
    <article className="schedule-session-card">
      <div className="schedule-session-time">
        <strong>{formatSessionTime(session.startTime)}</strong>
        <span>{formatSessionTime(session.endTime)}</span>
      </div>
      <span className="schedule-session-divider" aria-hidden="true" />
      <span className="schedule-student-avatar" aria-hidden="true">
        {sessionName.charAt(0).toUpperCase() || "?"}
      </span>
      <div className="schedule-session-main">
        <small className="schedule-session-type">
          {groupSession ? t.groupClass : t.individual}
        </small>
        <strong>{sessionName}</strong>
        <span>{groupSession ? classRecord?.subject ?? session.subject : session.subject}</span>
        {groupSession && activeStudentCount !== undefined && (
          <span className="schedule-session-member-count">{activeStudentCount} {t.activeStudents.toLowerCase()}</span>
        )}
        {session.notes && <span className="schedule-session-note">{session.notes}</span>}
      </div>
      <span className="schedule-session-duration">{session.durationMinutes} {t.minutes}</span>
      <StatusLabel status={session.status} />
      <details className="schedule-session-actions">
        <summary aria-label={`${t.sessionActions}: ${sessionName}`}>
          <Icon name="more" />
        </summary>
        <div className="schedule-action-menu">
          <button type="button" onClick={(event) => { closeMenu(event); onEdit(session); }}>{t.edit}</button>
          {canUpdateStatus && (
            <>
              <button type="button" onClick={(event) => { closeMenu(event); onStatusChange(session, "completed"); }}>
                {t.markCompleted}
              </button>
              <button type="button" onClick={(event) => { closeMenu(event); onStatusChange(session, "no_show"); }}>
                {t.markNoShow}
              </button>
              <button
                className="schedule-action-cancel"
                type="button"
                onClick={(event) => { closeMenu(event); onStatusChange(session, "cancelled"); }}
              >
                {t.cancelSession}
              </button>
            </>
          )}
        </div>
      </details>
    </article>
  );
}
