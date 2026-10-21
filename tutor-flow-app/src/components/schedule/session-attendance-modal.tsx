"use client";

import { useEffect, useMemo, useState } from "react";
import type { Attendance, AttendanceStatus, Class, ClassStudent, Session, Student } from "@/src/types";
import type { AttendanceEntry } from "@/src/features/attendance/attendance-service";
import { Icon } from "@/src/components/ui/icon";
import { formatSessionTime } from "@/src/features/schedule/schedule-service";
import { getTranslations } from "@/src/i18n";

type AttendanceRow = {
  student: Student;
  status: AttendanceStatus;
  remarks: string;
};

type SessionAttendanceModalProps = {
  session: Session;
  classRecord?: Class;
  students: Student[];
  classStudents: ClassStudent[];
  attendance: Attendance[];
  onClose: () => void;
  onSave: (entries: AttendanceEntry[]) => void;
};

const attendanceStatuses: AttendanceStatus[] = [
  "present",
  "absent",
  "late",
  "cancelled",
  "no_show",
];

function attendanceRowsFor(
  students: Student[],
  records: Attendance[],
  sessionId: string,
): AttendanceRow[] {
  const existingByStudent = new Map(
    records
      .filter((record) => record.sessionId === sessionId)
      .map((record) => [record.studentId, record]),
  );
  return students.map((student) => {
    const existing = existingByStudent.get(student.id);
    return {
      student,
      status: existing?.status ?? "present",
      remarks: existing?.remarks ?? "",
    };
  });
}

export function SessionAttendanceModal({
  session,
  classRecord,
  students,
  classStudents,
  attendance,
  onClose,
  onSave,
}: SessionAttendanceModalProps) {
  const t = getTranslations();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isGroupSession = session.type === "group";

  const sessionStudents = useMemo(() => {
    if (session.type === "individual") {
      const student = students.find((item) => item.id === session.studentId);
      return student ? [student] : [];
    }

    if (!session.classId) return [];
    const activeStudentIds = new Set(
      classStudents
        .filter((membership) => (
          membership.classId === session.classId && membership.status === "active"
        ))
        .map((membership) => membership.studentId),
    );
    return students.filter((student) => activeStudentIds.has(student.id));
  }, [classStudents, session.classId, session.studentId, session.type, students]);

  const [rows, setRows] = useState(() => attendanceRowsFor(sessionStudents, attendance, session.id));

  useEffect(() => {
    const timeout = window.setTimeout(() => setLoading(false), 120);
    return () => window.clearTimeout(timeout);
  }, []);

  function updateRow(studentId: string, update: Partial<Pick<AttendanceRow, "status" | "remarks">>) {
    setRows((current) => current.map((row) => (
      row.student.id === studentId ? { ...row, ...update } : row
    )));
  }

  function markAllPresent() {
    setRows((current) => current.map((row) => ({ ...row, status: "present" })));
    setError("");
  }

  function save() {
    setError("");
    if (rows.length === 0) {
      setError(t.noStudentsForAttendance);
      return;
    }
    const entries: AttendanceEntry[] = rows.map(({ student, status, remarks }) => ({
      studentId: student.id,
      status,
      remarks,
    }));
    try {
      onSave(entries);
    } catch {
      setError(t.attendanceSaveFailed);
    }
  }

  const title = isGroupSession ? classRecord?.className ?? t.groupClass : rows[0]?.student.fullName ?? t.student;

  return (
    <div className="student-modal-backdrop schedule-modal-backdrop attendance-modal-backdrop">
      <section
        className="student-modal attendance-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="attendance-title"
      >
        <header className="student-modal-header attendance-modal-header">
          <div>
            <p className="student-modal-eyebrow">{t.attendance}</p>
            <h2 id="attendance-title">{title}</h2>
            <p className="attendance-session-subtitle">
              {isGroupSession ? t.groupSession : t.individual}
              {" · "}{classRecord?.subject ?? session.subject}
            </p>
          </div>
          <button className="student-icon-button" type="button" onClick={onClose} aria-label={t.close}>
            <Icon name="close" />
          </button>
        </header>

        <div className="attendance-modal-content">
          <dl className="attendance-session-details">
            {isGroupSession && <div><dt>{t.class}</dt><dd>{classRecord?.className ?? t.groupClass}</dd></div>}
            <div><dt>{t.subject}</dt><dd>{classRecord?.subject ?? session.subject}</dd></div>
            <div><dt>{t.sessionDate}</dt><dd>{session.date}</dd></div>
            <div><dt>{t.time}</dt><dd>{formatSessionTime(session.startTime)}–{formatSessionTime(session.endTime)}</dd></div>
            {isGroupSession && <div><dt>{t.activeStudents}</dt><dd>{rows.length}</dd></div>}
          </dl>

          <div className="attendance-list-heading">
            <h3>{isGroupSession ? t.studentsInClass : t.student}</h3>
            <span className="student-section-count">{rows.length}</span>
            {rows.length > 0 && (
              <button className="attendance-mark-all" type="button" onClick={markAllPresent}>
                {t.markAllPresent}
              </button>
            )}
          </div>

          {loading ? (
            <div className="students-loading attendance-loading" role="status">
              <span className="student-loading-spinner" aria-hidden="true" />
              <span>{t.loadingAttendance}</span>
            </div>
          ) : rows.length === 0 ? (
            <div className="attendance-empty-state">
              <span className="students-empty-icon"><Icon name="users" /></span>
              <p>{isGroupSession ? t.noActiveClassStudents : t.noStudentForAttendance}</p>
            </div>
          ) : (
            <div className="attendance-student-list">
              {rows.map(({ student, status, remarks }) => (
                <article className="attendance-student-row" key={student.id}>
                  <span className="student-list-avatar" aria-hidden="true">
                    {student.fullName.charAt(0).toUpperCase()}
                  </span>
                  <div className="attendance-student-name">
                    <strong>{student.fullName}</strong>
                    <span>{student.subjects.length > 0 ? student.subjects.join(", ") : "—"}</span>
                  </div>
                  <label className="attendance-status-field">
                    <span>{t.attendanceStatus}</span>
                    <select
                      value={status}
                      onChange={(event) => updateRow(student.id, { status: event.target.value as AttendanceStatus })}
                    >
                      {attendanceStatuses.map((attendanceStatus) => (
                        <option value={attendanceStatus} key={attendanceStatus}>
                          {attendanceStatus === "no_show" ? t.noShow : t[attendanceStatus]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="attendance-remarks-field">
                    <span>{t.remarks} <span className="optional-label">({t.optional})</span></span>
                    <input
                      value={remarks}
                      onChange={(event) => updateRow(student.id, { remarks: event.target.value })}
                      placeholder={t.attendanceRemarksHint}
                    />
                  </label>
                </article>
              ))}
            </div>
          )}

          {error && <p className="form-submit-error attendance-error" role="alert">{error}</p>}
        </div>

        <footer className="student-form-footer attendance-modal-footer">
          <button className="student-button student-button-secondary" type="button" onClick={onClose}>
            {t.cancel}
          </button>
          <button
            className="student-button student-button-primary"
            type="button"
            onClick={save}
            disabled={loading || rows.length === 0}
          >
            {t.saveAttendance}
          </button>
        </footer>
      </section>
    </div>
  );
}
