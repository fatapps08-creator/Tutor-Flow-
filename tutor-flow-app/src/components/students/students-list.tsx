"use client";

import type { StudentStatus } from "@/src/types";
import type { StudentProfile } from "@/src/features/students/mock-data";
import { Icon } from "@/src/components/ui/icon";
import { getTranslations } from "@/src/i18n";

type StudentsListProps = {
  students: StudentProfile[];
  onView: (profile: StudentProfile) => void;
  onEdit: (profile: StudentProfile) => void;
  onArchive: (profile: StudentProfile) => void;
  onRestore: (profile: StudentProfile) => void;
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

function StudentActions({
  profile,
  onView,
  onEdit,
  onArchive,
  onRestore,
}: Omit<StudentsListProps, "students"> & { profile: StudentProfile }) {
  const t = getTranslations();
  const archived = profile.student.status === "inactive";

  return (
    <div className="student-actions">
      <button
        type="button"
        onClick={() => onView(profile)}
        aria-label={`${t.viewProfile}: ${profile.student.fullName}`}
      >
        {t.viewProfile}
      </button>
      <button
        type="button"
        onClick={() => onEdit(profile)}
        aria-label={`${t.edit}: ${profile.student.fullName}`}
      >
        {t.edit}
      </button>
      {archived ? (
        <button
          type="button"
          className="student-action-restore"
          onClick={() => onRestore(profile)}
          aria-label={`${t.restore}: ${profile.student.fullName}`}
        >
          {t.restore}
        </button>
      ) : (
        <button
          type="button"
          className="student-action-archive"
          onClick={() => onArchive(profile)}
          aria-label={`${t.archive}: ${profile.student.fullName}`}
        >
          {t.archive}
        </button>
      )}
    </div>
  );
}

function StudentAvatar({ name }: { name: string }) {
  return <span className="student-list-avatar" aria-hidden="true">{name.charAt(0).toUpperCase()}</span>;
}

export function StudentsList({ students, onView, onEdit, onArchive, onRestore }: StudentsListProps) {
  const t = getTranslations();
  const actionProps = { onView, onEdit, onArchive, onRestore };

  return (
    <>
      <div className="students-table-wrap">
        <table className="students-table">
          <thead>
            <tr>
              <th scope="col">{t.fullName}</th>
              <th scope="col">{t.subjects}</th>
              <th scope="col">{t.guardian}</th>
              <th scope="col">{t.phone}</th>
              <th scope="col">{t.status}</th>
              <th scope="col">{t.joinedDate}</th>
              <th scope="col"><span className="sr-only">{t.actions}</span></th>
            </tr>
          </thead>
          <tbody>
            {students.map(({ student, contact }) => (
              <tr key={student.id}>
                <td>
                  <button className="student-name-button" type="button" onClick={() => onView({ student, contact })}>
                    <StudentAvatar name={student.fullName} />
                    <span className="student-name-copy">
                      <strong>{student.fullName}</strong>
                      {student.gradeOrLevel && <span>{student.gradeOrLevel}</span>}
                    </span>
                  </button>
                </td>
                <td>
                  <div className="subject-chips">
                    {student.subjects.length > 0
                      ? student.subjects.map((subject) => <span className="subject-chip" key={subject}>{subject}</span>)
                      : <span className="muted-value">—</span>}
                  </div>
                </td>
                <td>{student.guardianName ?? <span className="muted-value">{t.noGuardian}</span>}</td>
                <td>{student.guardianPhone ?? <span className="muted-value">{t.noPhone}</span>}</td>
                <td><StatusBadge status={student.status} /></td>
                <td className="joined-date">{formatDate(student.joinedDate)}</td>
                <td><StudentActions profile={{ student, contact }} {...actionProps} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="students-mobile-list">
        {students.map((profile) => {
          const { student } = profile;
          return (
            <article className="student-mobile-card" key={student.id}>
              <div className="student-mobile-card-header">
                <button className="student-name-button" type="button" onClick={() => onView(profile)}>
                  <StudentAvatar name={student.fullName} />
                  <span className="student-name-copy">
                    <strong>{student.fullName}</strong>
                    {student.gradeOrLevel && <span>{student.gradeOrLevel}</span>}
                  </span>
                </button>
                <StatusBadge status={student.status} />
              </div>
              <div className="student-mobile-meta">
                <span className="student-mobile-meta-label">{t.subjects}</span>
                <div className="subject-chips">
                  {student.subjects.length > 0
                    ? student.subjects.map((subject) => <span className="subject-chip" key={subject}>{subject}</span>)
                    : <span className="muted-value">—</span>}
                </div>
                <span className="student-mobile-meta-label">{t.guardian}</span>
                <span>{student.guardianName ?? "—"}</span>
                <span className="student-mobile-meta-label">{t.phone}</span>
                <span>{student.guardianPhone ?? "—"}</span>
                <span className="student-mobile-meta-label">{t.joinedDate}</span>
                <span>{formatDate(student.joinedDate)}</span>
              </div>
              <div className="student-mobile-actions">
                <button
                  type="button"
                  onClick={() => onView(profile)}
                  aria-label={`${t.viewProfile}: ${student.fullName}`}
                >
                  {t.viewProfile}
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(profile)}
                  aria-label={`${t.edit}: ${student.fullName}`}
                >
                  {t.edit}
                </button>
                {student.status === "inactive" ? (
                  <button
                    className="student-action-restore"
                    type="button"
                    onClick={() => onRestore(profile)}
                    aria-label={`${t.restore}: ${student.fullName}`}
                  >
                    {t.restore}
                  </button>
                ) : (
                  <button
                    className="student-action-archive"
                    type="button"
                    onClick={() => onArchive(profile)}
                    aria-label={`${t.archive}: ${student.fullName}`}
                  >
                    {t.archive}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

export function StudentStatusFilter({
  value,
  onChange,
}: {
  value: "all" | StudentStatus;
  onChange: (status: "all" | StudentStatus) => void;
}) {
  const t = getTranslations();
  const options = [
    { value: "all", label: t.allStatuses },
    { value: "active", label: t.active },
    { value: "inactive", label: t.inactive },
    { value: "paused", label: t.paused },
  ] as const;

  return (
    <label className="students-filter">
      <span className="sr-only">{t.status}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as "all" | StudentStatus)}>
        {options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

export function StudentSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const t = getTranslations();
  return (
    <label className="students-search">
      <Icon name="search" />
      <span className="sr-only">{t.searchStudents}</span>
      <input
        type="search"
        value={value}
        placeholder={t.searchStudentsHint}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
