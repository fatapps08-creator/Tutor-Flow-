import Link from "next/link";
import type { Session } from "@/src/types";
import { demoStudentNames } from "@/src/data/dashboard";
import { Icon } from "@/src/components/ui/icon";
import { getTranslations } from "@/src/i18n";

export function ScheduleCard({ sessions }: { sessions: Session[] }) {
  const t = getTranslations();

  return (
    <section className="content-card schedule-card" aria-labelledby="schedule-title">
      <div className="content-card-header">
        <div>
          <p className="section-eyebrow">{t.todaySessions}</p>
          <h2 id="schedule-title">{t.todaysSchedule}</h2>
        </div>
        <Link className="text-link" href="/schedule">
          {t.viewSchedule}<Icon name="arrowRight" />
        </Link>
      </div>
      {sessions.length === 0 ? (
        <div className="card-empty-state">
          <span className="empty-icon"><Icon name="calendar" /></span>
          <p>{t.noSessions}</p>
        </div>
      ) : (
        <ul className="schedule-list">
          {sessions.map((session) => (
            <li className="schedule-row" key={session.id}>
              <div className="schedule-time">
                <strong>{session.startTime}</strong>
                <span>{session.durationMinutes} {t.minutes}</span>
              </div>
              <span className="schedule-rail" aria-hidden="true" />
              <div className="student-avatar" aria-hidden="true">
                {demoStudentNames[session.studentId]?.slice(0, 1)}
              </div>
              <div className="session-details">
                <strong>                {demoStudentNames[session.studentId] ?? t.student}</strong>
                <span>{session.subject}</span>
              </div>
              <span className={`status-pill status-${session.status}`}>
                <span className="status-dot" />
                {session.status === "upcoming" ? t.upcomingStatus : session.status.replace("_", " ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
