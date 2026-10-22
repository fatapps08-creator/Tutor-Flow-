"use client";

import { useMemo, useState, type FormEvent } from "react";
import type {
  Class,
  LearningProgress,
  LearningRecord,
  Session,
  Student,
} from "@/src/types";
import type {
  LearningRecordInput,
  LearningRecordUpdate,
} from "@/src/features/learning/learning-service";
import { evaluateCompletedSessionCandidates } from "@/src/features/learning/completed-session-candidates";
import { Icon } from "@/src/components/ui/icon";
import { getTranslations } from "@/src/i18n";

type LearningRecordFormModalProps = {
  record?: LearningRecord;
  sessions: Session[];
  students: Student[];
  classes: Class[];
  onClose: () => void;
  onSave: (
    submission:
      | { values: LearningRecordInput }
      | { recordId: string; values: LearningRecordUpdate },
  ) => Promise<void>;
};

const progressOptions: LearningProgress[] = [
  "excellent",
  "good",
  "improving",
  "needs_attention",
];

function statusLabel(status: Session["status"], t: ReturnType<typeof getTranslations>) {
  if (status === "completed") return t.completed;
  return status;
}

export function LearningRecordFormModal({
  record,
  sessions,
  students,
  classes,
  onClose,
  onSave,
}: LearningRecordFormModalProps) {
  const t = getTranslations();
  const [targetType, setTargetType] = useState(record?.targetType ?? "individual");
  const [sessionId, setSessionId] = useState(record?.sessionId ?? "");
  const [topic, setTopic] = useState(record?.topic ?? "");
  const [progress, setProgress] = useState<LearningProgress>(record?.progress ?? "good");
  const [remarks, setRemarks] = useState(record?.remarks ?? "");
  const [topicError, setTopicError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);

  const sessionEvaluation = useMemo(
    () => evaluateCompletedSessionCandidates(sessions, targetType, students, classes),
    [classes, sessions, students, targetType],
  );
  const completedSessions = sessionEvaluation.candidates;
  const selectedSession = sessions.find((session) => session.id === sessionId);
  const selectedStudent = selectedSession?.studentId
    ? students.find((student) => student.id === selectedSession.studentId)
    : undefined;
  const selectedClass = selectedSession?.classId
    ? classes.find((classRecord) => classRecord.id === selectedSession.classId)
    : undefined;
  const recordStudent = record?.targetType === "individual"
    ? students.find((student) => student.id === record.targetId)
    : undefined;
  const recordClass = record?.targetType === "group"
    ? classes.find((classRecord) => classRecord.id === record.targetId)
    : undefined;
  const recordSession = record ? sessions.find((session) => session.id === record.sessionId) : undefined;
  const fixedTargetName = recordStudent?.fullName ?? recordClass?.className
    ?? (record?.targetType === "group" ? t.groupClass : t.student);
  const noSessionsMessage = targetType === "individual"
    ? t.noCompletedIndividualSessions
    : t.noCompletedGroupSessions;

  function changeTargetType(nextType: "individual" | "group") {
    setTargetType(nextType);
    setSessionId("");
    setSubmitError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedTopic = topic.trim();
    if (!normalizedTopic) {
      setTopicError(t.topicRequired);
      return;
    }
    if (!record && !completedSessions.some((session) => session.id === sessionId)) {
      setSubmitError(t.completedSessionRequired);
      return;
    }

    setSaving(true);
    setSubmitError("");
    try {
      if (record) {
        await onSave({
          recordId: record.id,
          values: { topic: normalizedTopic, progress, remarks },
        });
      } else {
        await onSave({ values: { sessionId, topic: normalizedTopic, progress, remarks } });
      }
    } catch {
      setSubmitError(record ? t.learningRecordUpdateFailed : t.learningRecordSaveFailed);
      setSaving(false);
    }
  }

  return (
    <div className="student-modal-backdrop schedule-modal-backdrop learning-modal-backdrop">
      <section
        className="student-modal learning-form-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="learning-form-title"
      >
        <header className="student-modal-header">
          <div>
            <p className="student-modal-eyebrow">{t.learningRecords}</p>
            <h2 id="learning-form-title">{record ? t.editLearningRecord : t.addLearningRecordTitle}</h2>
          </div>
          <button className="student-icon-button" type="button" onClick={onClose} aria-label={t.close}>
            <Icon name="close" />
          </button>
        </header>

        <form className="learning-form" onSubmit={handleSubmit} noValidate>
          <div className="learning-form-content">
            {!record && (
              <>
                <fieldset className="learning-type-field">
                  <legend>{t.learningTargetType} <span className="required-mark">*</span></legend>
                  <div className="learning-type-options">
                    {(["individual", "group"] as const).map((type) => (
                      <button
                        className={`learning-type-option${targetType === type ? " is-selected" : ""}`}
                        type="button"
                        key={type}
                        aria-pressed={targetType === type}
                        onClick={() => changeTargetType(type)}
                      >
                        <Icon name={type === "individual" ? "users" : "book"} />
                        {type === "individual" ? t.individual : t.groupClass}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <label className="student-field learning-field">
                  <span>{t.learningSession} <span className="required-mark">*</span></span>
                  <select
                    value={sessionId}
                    onChange={(event) => {
                      setSessionId(event.target.value);
                      setSubmitError("");
                    }}
                    required
                  >
                    <option value="">{t.chooseCompletedSession}</option>
                    {completedSessions.map((session) => {
                      const targetName = session.type === "individual"
                        ? students.find((student) => student.id === session.studentId)?.fullName ?? t.student
                        : classes.find((classRecord) => classRecord.id === session.classId)?.className ?? t.groupClass;
                      return (
                        <option value={session.id} key={session.id}>
                          {targetName} · {session.subject} · {session.date}
                        </option>
                      );
                    })}
                  </select>
                  {completedSessions.length === 0 && (
                    <span className="field-hint">{noSessionsMessage}</span>
                  )}
                </label>

                {selectedSession && (
                  <dl className="learning-session-details">
                    <div>
                      <dt>{targetType === "individual" ? t.student : t.class}</dt>
                      <dd>{selectedStudent?.fullName ?? selectedClass?.className ?? "—"}</dd>
                    </div>
                    <div><dt>{t.subject}</dt><dd>{selectedSession.subject}</dd></div>
                    <div><dt>{t.sessionDate}</dt><dd>{selectedSession.date}</dd></div>
                    <div><dt>{t.sessionStatus}</dt><dd>{statusLabel(selectedSession.status, t)}</dd></div>
                  </dl>
                )}
              </>
            )}

            {record && (
              <dl className="learning-session-details learning-fixed-session">
                <div><dt>{record.targetType === "individual" ? t.student : t.class}</dt><dd>{fixedTargetName}</dd></div>
                <div><dt>{t.subject}</dt><dd>{record.subject}</dd></div>
                <div><dt>{t.sessionDate}</dt><dd>{recordSession?.date ?? record.date}</dd></div>
                <div><dt>{t.learningSession}</dt><dd>{record.sessionId}</dd></div>
              </dl>
            )}

            <label className="student-field learning-field">
              <span>{t.topic} <span className="required-mark">*</span></span>
              <input
                autoFocus={Boolean(record)}
                value={topic}
                onChange={(event) => {
                  setTopic(event.target.value);
                  setTopicError("");
                }}
                aria-invalid={Boolean(topicError)}
                required
              />
              {topicError && <span className="field-error">{topicError}</span>}
            </label>

            <label className="student-field learning-field">
              <span>{t.progress} <span className="required-mark">*</span></span>
              <select
                value={progress}
                onChange={(event) => setProgress(event.target.value as LearningProgress)}
                required
              >
                {progressOptions.map((option) => (
                  <option value={option} key={option}>{t[option === "needs_attention" ? "needsAttention" : option]}</option>
                ))}
              </select>
            </label>

            <label className="student-field learning-field">
              <span>{t.remarks} <span className="optional-label">({t.optional})</span></span>
              <textarea rows={3} value={remarks} onChange={(event) => setRemarks(event.target.value)} />
            </label>
            {submitError && <p className="form-submit-error" role="alert">{submitError}</p>}
          </div>

          <footer className="student-form-footer">
            <button className="student-button student-button-secondary" type="button" onClick={onClose}>
              {t.cancel}
            </button>
            <button
              className="student-button student-button-primary"
              type="submit"
              disabled={saving || (!record && completedSessions.length === 0)}
            >
              {saving ? t.saving : t.saveLearningRecord}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
