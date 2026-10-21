"use client";

import type { Class, Session, SessionStatus, Student } from "@/src/types";
import { Icon } from "@/src/components/ui/icon";
import { getTranslations } from "@/src/i18n";
import { SessionCard } from "@/src/components/schedule/session-card";

type ScheduleListProps = {
  sessions: Session[];
  studentsById: Map<string, Student>;
  classesById: Map<string, Class>;
  activeStudentCountsByClass: Map<string, number>;
  onCreate: () => void;
  onEdit: (session: Session) => void;
  onAttendance: (session: Session) => void;
  onStatusChange: (session: Session, status: SessionStatus) => void;
  emptyTitle: string;
  emptyDescription: string;
};

export function ScheduleList({
  sessions,
  studentsById,
  classesById,
  activeStudentCountsByClass,
  onCreate,
  onEdit,
  onAttendance,
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
          student={
            session.type === "individual" && session.studentId
              ? studentsById.get(session.studentId)
              : undefined
          }
          classRecord={
            session.type === "group" && session.classId
              ? classesById.get(session.classId)
              : undefined
          }
          activeStudentCount={
            session.type === "group" && session.classId
              ? activeStudentCountsByClass.get(session.classId)
              : undefined
          }
          onEdit={onEdit}
          onAttendance={onAttendance}
          onStatusChange={onStatusChange}
        />
      ))}
    </div>
  );
}
