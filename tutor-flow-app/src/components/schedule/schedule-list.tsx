"use client";

import type { Session, SessionStatus, Student } from "@/src/types";
import { Icon } from "@/src/components/ui/icon";
import { getTranslations } from "@/src/i18n";
import { SessionCard } from "@/src/components/schedule/session-card";

type ScheduleListProps = {
  sessions: Session[];
  studentsById: Map<string, Student>;
  onCreate: () => void;
  onEdit: (session: Session) => void;
  onStatusChange: (session: Session, status: SessionStatus) => void;
  emptyTitle: string;
  emptyDescription: string;
};

export function ScheduleList({
  sessions,
  studentsById,
  onCreate,
  onEdit,
  onStatusChange,
  emptyTitle,
  emptyDescription,
}: ScheduleListProps) {
  const t = getTranslations();

  if (sessions.length === 0) {
    return (
      <div className="schedule-empty-state">
        <span className="schedule-empty-icon"><Icon name="calendar" /></span>
        <h2>{emptyTitle}</h2>
        <p>{emptyDescription}</p>
        <button className="student-button student-button-primary" type="button" onClick={onCreate}>
          <Icon name="plus" />{t.createFirstSession}
        </button>
      </div>
    );
  }

  return (
    <div className="schedule-session-list">
      {sessions.map((session) => (
        <SessionCard
          key={session.id}
          session={session}
          student={studentsById.get(session.studentId)}
          onEdit={onEdit}
          onStatusChange={onStatusChange}
        />
      ))}
    </div>
  );
}
