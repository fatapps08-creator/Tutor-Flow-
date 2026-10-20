"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { SessionStatus } from "@/src/types";
import type { Student } from "@/src/types";
import type { Session } from "@/src/types";
import {
  durationBetween,
  timeFromMinutes,
  validateSessionForm,
  type SessionFormErrors,
  type SessionFormValues,
} from "@/src/features/schedule/session-form";
import { formatSessionTime, timeToMinutes, toTimeInputValue } from "@/src/features/schedule/schedule-service";
import { Icon } from "@/src/components/ui/icon";
import { getTranslations } from "@/src/i18n";

type SessionFormModalProps = {
  students: Student[];
  session?: Session;
  today: string;
  onClose: () => void;
  onSave: (values: SessionFormValues, allowConflict: boolean) => Promise<void>;
  conflict?: Session;
  setConflict: (session?: Session) => void;
};

const CUSTOM_SUBJECT = "__custom_subject__";

function initialValues(session: Session | undefined, today: string): SessionFormValues {
  return {
    studentId: session?.studentId ?? "",
    subject: session?.subject ?? "",
    date: session?.date ?? today,
    startTime: toTimeInputValue(session?.startTime ?? "09:00"),
    endTime: toTimeInputValue(session?.endTime ?? "10:00"),
    durationMinutes: String(session?.durationMinutes ?? 60),
    status: session?.status ?? "upcoming",
    notes: session?.notes ?? "",
  };
}

export function SessionFormModal({
  students,
  session,
  today,
  onClose,
  onSave,
  conflict,
  setConflict,
}: SessionFormModalProps) {
  const t = getTranslations();
  useEffect(() => {
    const scrollY = window.scrollY;
    const previousStyles = {
      htmlOverflow: document.documentElement.style.overflow,
      bodyOverflow: document.body.style.overflow,
      bodyPosition: document.body.style.position,
      bodyTop: document.body.style.top,
      bodyLeft: document.body.style.left,
      bodyRight: document.body.style.right,
      bodyWidth: document.body.style.width,
    };
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    return () => {
      document.documentElement.style.overflow = previousStyles.htmlOverflow;
      document.body.style.overflow = previousStyles.bodyOverflow;
      document.body.style.position = previousStyles.bodyPosition;
      document.body.style.top = previousStyles.bodyTop;
      document.body.style.left = previousStyles.bodyLeft;
      document.body.style.right = previousStyles.bodyRight;
      document.body.style.width = previousStyles.bodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, []);
  const [values, setValues] = useState(() => initialValues(session, today));
  const [errors, setErrors] = useState<SessionFormErrors>({});
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [customSubject, setCustomSubject] = useState(() => {
    const student = students.find((item) => item.id === session?.studentId);
    return !session || !student?.subjects.includes(session.subject);
  });

  function updateField<K extends keyof SessionFormValues>(field: K, value: SessionFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSaveError("");
    if (conflict) {
      setConflict(undefined);
    }
  }

  function updateStart(value: string) {
    const duration = Number(values.durationMinutes);
    const start = timeToMinutes(value);
    setValues((current) => ({
      ...current,
      startTime: value,
      endTime: Number.isFinite(start) && Number.isFinite(duration)
        ? timeFromMinutes(start + duration)
        : current.endTime,
    }));
    setErrors((current) => ({ ...current, startTime: undefined, endTime: undefined }));
    setConflict(undefined);
  }

  function updateEnd(value: string) {
    const start = values.startTime;
    setValues((current) => ({
      ...current,
      endTime: value,
      durationMinutes: String(durationBetween(start, value)),
    }));
    setErrors((current) => ({ ...current, endTime: undefined, durationMinutes: undefined }));
    setConflict(undefined);
  }

  function updateDuration(value: string) {
    const start = timeToMinutes(values.startTime);
    const duration = Number(value);
    setValues((current) => ({
      ...current,
      durationMinutes: value,
      endTime: Number.isFinite(start) && Number.isFinite(duration) && duration > 0
        ? timeFromMinutes(start + duration)
        : current.endTime,
    }));
    setErrors((current) => ({ ...current, durationMinutes: undefined, endTime: undefined }));
    setConflict(undefined);
  }

  async function save(allowConflict: boolean) {
    const nextErrors = validateSessionForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setConflict(undefined);
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      await onSave(values, allowConflict);
    } catch (error) {
      if (error instanceof Error && error.message === "SCHEDULE_CONFLICT") {
        setSaveError("");
      } else {
        setSaveError(t.sessionSaveFailed);
      }
      setSaving(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void save(false);
  }

  function fieldError(field: keyof SessionFormValues) {
    const error = errors[field];
    if (!error) return null;
    const message = error === "invalidTime"
      ? t.invalidTime
      : error === "durationRequired"
        ? t.durationRequired
        : error === "subjectRequired"
          ? t.subjectRequired
          : error === "pastDate"
            ? t.pastDate
            : error === "sessionInPast"
              ? t.sessionInPast
              : t.sessionRequired;
    return <span className="field-error" id={`${field}-error`}>{message}</span>;
  }

  function chooseStudent(studentId: string) {
    const student = students.find((item) => item.id === studentId);
    const currentSubject = values.subject.trim();
    const knownSubject = Boolean(student?.subjects.includes(currentSubject));
    updateField("studentId", studentId);
    if (knownSubject) {
      setCustomSubject(false);
    } else if (student?.subjects.length === 1) {
      setCustomSubject(false);
      updateField("subject", student.subjects[0]);
    } else if (currentSubject) {
      setCustomSubject(true);
    } else {
      setCustomSubject(false);
    }
  }

  const selectedStudent = students.find((student) => student.id === values.studentId);
  const studentSubjects = selectedStudent?.subjects ?? [];

  const conflictStudentName = conflict
    ? students.find((student) => student.id === conflict.studentId)?.fullName ?? t.student
    : "";

  return (
    <div className="student-modal-backdrop schedule-modal-backdrop">
      <section
        className="student-modal session-form-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-form-title"
      >
        <header className="student-modal-header">
          <div>
            <p className="student-modal-eyebrow">{t.schedule}</p>
            <h2 id="session-form-title">{session ? t.editSessionTitle : t.addSessionTitle}</h2>
          </div>
          <button className="student-icon-button" type="button" onClick={onClose} aria-label={t.close}>
            <Icon name="close" />
          </button>
        </header>

        {students.length === 0 ? (
          <div className="session-no-students">
            <span className="students-empty-icon"><Icon name="users" /></span>
            <p>{t.noStudentsForSessions}</p>
            <button className="student-button student-button-secondary" type="button" onClick={onClose}>
              {t.close}
            </button>
          </div>
        ) : (
          <form className="student-form session-form" onSubmit={handleSubmit} noValidate>
            <div className="session-form-content">
              <div className="student-form-grid">
                <label className="student-field">
                  <span>{t.student} <span className="required-mark">*</span></span>
                  <select
                    value={values.studentId}
                    onChange={(event) => chooseStudent(event.target.value)}
                    aria-invalid={Boolean(errors.studentId)}
                    aria-describedby={errors.studentId ? "studentId-error" : undefined}
                  >
                    <option value="">{t.chooseStudent}</option>
                    {students.map((student) => (
                      <option value={student.id} key={student.id}>{student.fullName}</option>
                    ))}
                  </select>
                  {fieldError("studentId")}
                </label>

                <label className="student-field">
                  <span>{t.sessionSubject} <span className="required-mark">*</span></span>
                  <select
                    value={customSubject ? CUSTOM_SUBJECT : values.subject}
                    onChange={(event) => {
                      const subject = event.target.value;
                      const isCustom = subject === CUSTOM_SUBJECT;
                      setCustomSubject(isCustom);
                      updateField("subject", isCustom ? "" : subject);
                    }}
                    aria-invalid={Boolean(errors.subject)}
                    aria-describedby={errors.subject ? "subject-error" : undefined}
                  >
                    <option value="">{t.sessionSubject}</option>
                    {studentSubjects.map((subject) => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                    <option value={CUSTOM_SUBJECT}>{t.otherSubject}</option>
                  </select>
                  {customSubject && (
                    <input
                      autoComplete="off"
                      value={values.subject}
                      placeholder={t.subjectRequired}
                      onChange={(event) => updateField("subject", event.target.value)}
                      aria-invalid={Boolean(errors.subject)}
                      aria-describedby={errors.subject ? "subject-error" : undefined}
                    />
                  )}
                  {fieldError("subject")}
                </label>

                <label className="student-field">
                  <span>{t.sessionDate} <span className="required-mark">*</span></span>
                  <input
                    type="date"
                    value={values.date}
                    onChange={(event) => updateField("date", event.target.value)}
                    aria-invalid={Boolean(errors.date)}
                    aria-describedby={errors.date ? "date-error" : undefined}
                  />
                  {fieldError("date")}
                </label>

                <label className="student-field">
                  <span>{t.sessionStatus}</span>
                  <select
                    value={values.status}
                    onChange={(event) => updateField("status", event.target.value as SessionStatus)}
                  >
                    <option value="upcoming">{t.upcoming}</option>
                    <option value="completed">{t.completed}</option>
                    <option value="cancelled">{t.cancelled}</option>
                    <option value="no_show">{t.noShow}</option>
                  </select>
                </label>

                <label className="student-field">
                  <span>{t.startTime} <span className="required-mark">*</span></span>
                  <input
                    type="time"
                    value={values.startTime}
                    onChange={(event) => updateStart(event.target.value)}
                    aria-invalid={Boolean(errors.startTime)}
                    aria-describedby={errors.startTime ? "startTime-error" : undefined}
                  />
                  {fieldError("startTime")}
                </label>

                <label className="student-field">
                  <span>{t.endTime} <span className="required-mark">*</span></span>
                  <input
                    type="time"
                    value={values.endTime}
                    onChange={(event) => updateEnd(event.target.value)}
                    aria-invalid={Boolean(errors.endTime)}
                    aria-describedby={errors.endTime ? "endTime-error" : undefined}
                  />
                  {fieldError("endTime")}
                </label>

                <label className="student-field">
                  <span>{t.durationMinutes} <span className="required-mark">*</span></span>
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    step="1"
                    inputMode="numeric"
                    value={values.durationMinutes}
                    onChange={(event) => updateDuration(event.target.value)}
                    aria-invalid={Boolean(errors.durationMinutes)}
                    aria-describedby={errors.durationMinutes ? "durationMinutes-error" : undefined}
                  />
                  {fieldError("durationMinutes")}
                </label>

                <label className="student-field student-field-wide">
                  <span>{t.sessionNotes} <span className="optional-label">({t.optional})</span></span>
                  <textarea
                    rows={3}
                    placeholder={t.sessionNotesHint}
                    value={values.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                  />
                </label>
              </div>

              {conflict && (
                <div className="schedule-conflict-warning" role="alert">
                  <Icon name="calendar" />
                  <div className="schedule-conflict-copy">
                    <strong>{t.scheduleConflict}</strong>
                    <p>
                      {t.conflictingSession}: {conflictStudentName} · {formatSessionTime(conflict.startTime)}–{formatSessionTime(conflict.endTime)}
                    </p>
                    <div className="conflict-actions">
                      <button
                        className="student-button student-button-secondary"
                        type="button"
                        onClick={() => setConflict(undefined)}
                      >
                        {t.reviewConflict}
                      </button>
                      <button
                        className="student-button student-button-primary"
                        type="button"
                        disabled={saving}
                        onClick={() => void save(true)}
                      >
                        {t.saveDespiteConflict}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {saveError && <p className="form-submit-error" role="alert">{saveError}</p>}
            </div>

            <footer className="student-form-footer">
              <button className="student-button student-button-secondary" type="button" onClick={onClose}>
                {t.cancel}
              </button>
              <button
                className="student-button student-button-primary"
                type="submit"
                disabled={saving || Boolean(conflict)}
              >
                {saving ? t.saving : t.saveSession}
              </button>
            </footer>
          </form>
        )}
      </section>
    </div>
  );
}
