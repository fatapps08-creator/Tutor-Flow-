"use client";

import type { Attendance, LearningProgress, LearningRecord, Payment, Session, StudentStatus } from "@/src/types";
import type { StudentProfile } from "@/src/features/students/mock-data";
import { Icon } from "@/src/components/ui/icon";
import { getTranslations } from "@/src/i18n";

type StudentProfileModalProps = {
  profile: StudentProfile;
  sessions: Session[];
  learningRecords: LearningRecord[];
  attendance: Attendance[];
  payments: Payment[];
  onClose: () => void;
  onEdit: () => void;
};

const progressKeys: Record<LearningProgress, "excellent" | "good" | "improving" | "needsAttention"> = {
  excellent: "excellent",
  good: "good",
  improving: "improving",
  needs_attention: "needsAttention",
};

function formatDate(date: string) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function StatusBadge({ status }: { status: StudentStatus }) {
  const t = getTranslations();
  return <span className={`student-status status-${status}`}>{t[status]}</span>;
}

export function StudentProfileModal({
  profile,
  sessions,
  learningRecords,
  attendance,
  payments,
  onClose,
  onEdit,
}: StudentProfileModalProps) {
  const t = getTranslations();
  const { student, contact } = profile;
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = sessions
    .filter((session) => (
      session.type === "individual"
      && session.studentId === student.id
      && session.date >= today
      && session.status === "upcoming"
    ))
    .sort((a, b) => a.date.localeCompare(b.date));
  const records = learningRecords.filter(
    (record) => record.targetType === "individual" && record.targetId === student.id,
  );
  const attendanceRecords = attendance.filter((record) => record.studentId === student.id);
  const paymentRecords = payments.filter((payment) => payment.studentId === student.id);

  function attendanceLabel(status: Attendance["status"]) {
    const key = status === "no_show" ? "noShow" : status;
    return t[key];
  }

  return (
    <div className="student-modal-backdrop">
      <section
        className="student-modal student-profile-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-profile-title"
      >
        <header className="student-modal-header">
          <div className="student-profile-heading">
            <span className="student-list-avatar student-profile-avatar" aria-hidden="true">
              {student.fullName.charAt(0).toUpperCase()}
            </span>
            <div>
              <p className="student-modal-eyebrow">{t.studentDetails}</p>
              <h2 id="student-profile-title">{student.fullName}</h2>
            </div>
            <StatusBadge status={student.status} />
          </div>
          <button className="student-icon-button" type="button" onClick={onClose} aria-label={t.close}>
            <Icon name="close" />
          </button>
        </header>

        <div className="student-profile-content">
          <section className="student-profile-section" aria-labelledby="student-information-title">
            <div className="student-profile-section-heading">
              <h3 id="student-information-title">{t.studentInformation}</h3>
              <button className="student-button student-button-secondary student-compact-button" type="button" onClick={onEdit}>
                {t.edit}
              </button>
            </div>
            <dl className="student-information-grid">
              <div><dt>{t.fullName}</dt><dd>{student.fullName}</dd></div>
              <div><dt>{t.subjects}</dt><dd>{student.subjects.length ? student.subjects.join(", ") : "—"}</dd></div>
              <div><dt>{t.gradeLevel}</dt><dd>{student.gradeOrLevel || "—"}</dd></div>
              <div><dt>{t.guardian}</dt><dd>{student.guardianName || "—"}</dd></div>
              <div><dt>{t.phone}</dt><dd>{student.guardianPhone || "—"}</dd></div>
              <div><dt>{t.email}</dt><dd>{contact.email || "—"}</dd></div>
              <div><dt>{t.dateOfBirth}</dt><dd>{contact.dateOfBirth ? formatDate(contact.dateOfBirth) : "—"}</dd></div>
              <div><dt>{t.joinedDate}</dt><dd>{formatDate(student.joinedDate)}</dd></div>
              <div className="student-information-wide"><dt>{t.address}</dt><dd>{contact.address || "—"}</dd></div>
              {student.notes && <div className="student-information-wide"><dt>{t.notes}</dt><dd>{student.notes}</dd></div>}
            </dl>
          </section>

          <section className="student-profile-section" aria-labelledby="upcoming-sessions-title">
            <div className="student-profile-section-heading">
              <h3 id="upcoming-sessions-title">{t.upcomingSessions}</h3>
              <span className="student-section-count">{upcoming.length}</span>
            </div>
            {upcoming.length === 0 ? (
              <p className="student-profile-empty">{t.noUpcomingSessions}</p>
            ) : (
              <ul className="student-record-list">
                {upcoming.map((session) => (
                  <li key={session.id}>
                    <span className="student-record-icon tone-blue"><Icon name="calendar" /></span>
                    <span className="student-record-copy">
                      <strong>{session.subject}</strong>
                      <span>{formatDate(session.date)} · {session.startTime} · {session.durationMinutes} {t.minutes}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="student-profile-section" aria-labelledby="learning-records-title">
            <div className="student-profile-section-heading">
              <h3 id="learning-records-title">{t.learningRecords}</h3>
              <span className="student-section-count">{records.length}</span>
            </div>
            {records.length === 0 ? (
              <p className="student-profile-empty">{t.noStudentLearningRecords}</p>
            ) : (
              <ul className="student-record-list">
                {records.map((record) => (
                  <li key={record.id}>
                    <span className="student-record-icon tone-violet"><Icon name="book" /></span>
                    <span className="student-record-copy">
                      <strong>{record.topic} · {record.subject}</strong>
                      <span>{formatDate(record.date)}{record.remarks ? ` · ${record.remarks}` : ""}</span>
                    </span>
                    <span className="student-record-tag">{t[progressKeys[record.progress]]}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="student-profile-section" aria-labelledby="attendance-title">
            <div className="student-profile-section-heading">
              <h3 id="attendance-title">{t.attendance}</h3>
              <span className="student-section-count">{attendanceRecords.length}</span>
            </div>
            {attendanceRecords.length === 0 ? (
              <p className="student-profile-empty">{t.noAttendanceRecords}</p>
            ) : (
              <ul className="student-record-list">
                {attendanceRecords.map((record) => (
                  <li key={record.id}>
                    <span className="student-record-icon tone-green"><Icon name="check" /></span>
                    <span className="student-record-copy">
                      <strong>{attendanceLabel(record.status)}</strong>
                      <span>{formatDate(record.date)}{record.remarks ? ` · ${record.remarks}` : ""}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="student-profile-section" aria-labelledby="payments-title">
            <div className="student-profile-section-heading">
              <h3 id="payments-title">{t.payments}</h3>
              <span className="student-section-count">{paymentRecords.length}</span>
            </div>
            {paymentRecords.length === 0 ? (
              <p className="student-profile-empty">{t.noPaymentRecords}</p>
            ) : (
              <ul className="student-record-list">
                {paymentRecords.map((payment) => (
                  <li key={payment.id}>
                    <span className="student-record-icon tone-amber"><Icon name="wallet" /></span>
                    <span className="student-record-copy">
                      <strong>
                        {new Intl.NumberFormat("en", {
                          style: "currency",
                          currency: payment.currency,
                        }).format(payment.amount)}
                      </strong>
                      <span>{payment.billingMonth}{payment.paidAt ? ` · ${t.paidAt} ${formatDate(payment.paidAt)}` : ""}</span>
                    </span>
                    <span className={`student-status status-${payment.status}`}>
                      {t[payment.status]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <footer className="student-profile-footer">
          <button className="student-button student-button-secondary" type="button" onClick={onClose}>
            {t.close}
          </button>
        </footer>
      </section>
    </div>
  );
}
