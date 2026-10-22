"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  AttendanceStatus,
  LearningProgress,
  LearningRecord,
  Student,
} from "@/src/types";
import { initialStudents } from "@/src/features/students/mock-data";
import {
  addLearningRecord,
  deleteLearningRecord,
  listLearningRecords,
  updateLearningRecord,
  type LearningRecordInput,
  type LearningRecordUpdate,
} from "@/src/features/learning/learning-service";
import { useLearningRecords } from "@/src/features/learning/use-learning-records";
import { useSessions } from "@/src/features/schedule/use-sessions";
import { useClasses } from "@/src/features/classes/use-classes";
import { useAttendance } from "@/src/features/attendance/use-attendance";
import { LearningRecordFormModal } from "@/src/components/learning/learning-record-form-modal";
import { Icon } from "@/src/components/ui/icon";
import { getTranslations } from "@/src/i18n";

type LearningTypeFilter = "all" | "individual" | "group";

function formatDate(date: string) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date.slice(0, 10)}T12:00:00`));
}

function progressKey(progress: LearningProgress) {
  return progress === "needs_attention" ? "needsAttention" : progress;
}

function attendanceStatusLabel(status: AttendanceStatus, t: ReturnType<typeof getTranslations>) {
  if (status === "no_show") return t.noShow;
  return t[status];
}

export function LearningManager() {
  const t = getTranslations();
  const records = useLearningRecords();
  const sessions = useSessions();
  const { classes } = useClasses();
  const attendance = useAttendance();
  const students = useMemo<Student[]>(() => initialStudents.map(({ student }) => student), []);
  const studentsById = useMemo(() => new Map(students.map((student) => [student.id, student])), [students]);
  const classesById = useMemo(() => new Map(classes.map((classRecord) => [classRecord.id, classRecord])), [classes]);
  const sessionsById = useMemo(() => new Map(sessions.map((session) => [session.id, session])), [sessions]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<LearningTypeFilter>("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [targetFilter, setTargetFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LearningRecord>();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string }>();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        listLearningRecords();
        setLoading(false);
      } catch {
        setLoadError(true);
        setLoading(false);
      }
    }, 180);
    return () => window.clearTimeout(timeout);
  }, []);

  const subjects = useMemo(
    () => [...new Set(records.map((record) => (
      sessionsById.get(record.sessionId)?.subject ?? record.subject
    )))].sort((a, b) => a.localeCompare(b)),
    [records, sessionsById],
  );
  const targets = useMemo(() => {
    const options = new Map<string, string>();
    for (const record of records) {
      const key = `${record.targetType}:${record.targetId}`;
      const name = record.targetType === "individual"
        ? studentsById.get(record.targetId)?.fullName ?? t.student
        : classesById.get(record.targetId)?.className ?? t.groupClass;
      options.set(key, name);
    }
    return [...options.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [classesById, records, studentsById, t.groupClass, t.student]);

  const visibleRecords = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return records.filter((record) => {
      const subject = sessionsById.get(record.sessionId)?.subject ?? record.subject;
      const targetName = record.targetType === "individual"
        ? studentsById.get(record.targetId)?.fullName ?? ""
        : classesById.get(record.targetId)?.className ?? "";
      const matchesQuery = !query || [
        record.topic,
        record.remarks ?? "",
        subject,
        targetName,
      ].some((value) => value.toLocaleLowerCase().includes(query));
      return matchesQuery
        && (typeFilter === "all" || record.targetType === typeFilter)
        && (subjectFilter === "all" || subject === subjectFilter)
        && (targetFilter === "all" || `${record.targetType}:${record.targetId}` === targetFilter);
    });
  }, [classesById, records, search, sessionsById, studentsById, subjectFilter, targetFilter, typeFilter]);

  function openAddForm() {
    setEditing(undefined);
    setFormOpen(true);
    setFeedback(undefined);
  }

  function openEditForm(record: LearningRecord) {
    setEditing(record);
    setFormOpen(true);
    setFeedback(undefined);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(undefined);
  }

  async function saveRecord(
    submission:
      | { values: LearningRecordInput }
      | { recordId: string; values: LearningRecordUpdate },
  ) {
    try {
      if ("recordId" in submission) {
        updateLearningRecord(submission.recordId, submission.values);
        setFeedback({ type: "success", message: t.learningRecordUpdated });
      } else {
        addLearningRecord(submission.values);
        setFeedback({ type: "success", message: t.learningRecordAdded });
      }
      closeForm();
    } catch (error) {
      setFeedback({
        type: "error",
        message: "recordId" in submission ? t.learningRecordUpdateFailed : t.learningRecordSaveFailed,
      });
      throw error;
    }
  }

  function removeRecord(record: LearningRecord) {
    if (!window.confirm(`${t.deleteLearningConfirmation}\n\n${record.topic}`)) return;
    try {
      deleteLearningRecord(record.id);
      setFeedback({ type: "success", message: t.learningRecordDeleted });
    } catch {
      setFeedback({ type: "error", message: t.learningRecordDeleteFailed });
    }
  }

  function attendanceMessage(record: LearningRecord) {
    const sessionRecords = attendance.filter((item) => item.sessionId === record.sessionId);
    if (record.targetType === "individual") {
      const individualAttendance = sessionRecords.find((item) => item.studentId === record.targetId);
      if (
        individualAttendance
        && ["absent", "no_show", "cancelled"].includes(individualAttendance.status)
      ) {
        return t.individualAttendanceWarning.replace(
          "{status}",
          attendanceStatusLabel(individualAttendance.status, t).toLocaleLowerCase(),
        );
      }
      return "";
    }

    if (sessionRecords.length === 0) return "";
    const concerns = sessionRecords.filter((item) => (
      ["absent", "no_show", "cancelled"].includes(item.status)
    ));
    const counts = new Map<AttendanceStatus, number>();
    for (const item of concerns) {
      counts.set(item.status, (counts.get(item.status) ?? 0) + 1);
    }
    const details = [...counts].map(([status, count]) => (
      t.groupAttendanceConcernDetail
        .replace("{count}", String(count))
        .replace("{status}", attendanceStatusLabel(status, t).toLocaleLowerCase())
    ));
    const summary = t.groupAttendanceSummary.replace("{count}", String(sessionRecords.length));
    return concerns.length > 0
      ? `${summary} ${t.groupAttendanceConcerns.replace("{details}", details.join(", "))}`
      : summary;
  }

  const filterEmpty = records.length > 0 && visibleRecords.length === 0;

  return (
    <>
      <div className="page-container learning-page">
        <header className="page-header students-page-header learning-page-header">
          <div className="page-header">
            <p className="page-eyebrow">{t.dashboardOverview}</p>
            <h1>{t.learningRecords}</h1>
            <p className="page-description">{t.learningPageDescription}</p>
          </div>
          <button
            className="student-button student-button-primary add-student-button"
            type="button"
            onClick={openAddForm}
            aria-label={t.addLearningRecord}
          >
            <Icon name="plus" />
            {t.addLearningRecord}
          </button>
        </header>

        {feedback && (
          <div className={`student-feedback feedback-${feedback.type}`} role={feedback.type === "error" ? "alert" : "status"}>
            <Icon name={feedback.type === "success" ? "check" : "clipboard"} />
            <span>{feedback.message}</span>
            <button type="button" onClick={() => setFeedback(undefined)} aria-label={t.close}>
              <Icon name="close" />
            </button>
          </div>
        )}

        <section className="students-panel learning-panel" aria-label={t.learningRecords} aria-busy={loading}>
          <div className="learning-panel-header">
            <div className="learning-filter-tabs" role="group" aria-label={t.learningTypeFilter}>
              {(["all", "individual", "group"] as const).map((filter) => (
                <button
                  className={typeFilter === filter ? "is-active" : ""}
                  type="button"
                  key={filter}
                  aria-pressed={typeFilter === filter}
                  onClick={() => setTypeFilter(filter)}
                >
                  {filter === "all" ? t.allLearningRecords : filter === "individual" ? t.individual : t.groupClass}
                </button>
              ))}
            </div>
            <div className="learning-controls">
              <label className="students-search learning-search">
                <Icon name="search" />
                <span className="sr-only">{t.searchLearningRecords}</span>
                <input
                  type="search"
                  value={search}
                  placeholder={t.searchLearningRecordsHint}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <label className="students-filter">
                <span className="sr-only">{t.subjectFilter}</span>
                <select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}>
                  <option value="all">{t.allSubjects}</option>
                  {subjects.map((subject) => <option value={subject} key={subject}>{subject}</option>)}
                </select>
              </label>
              <label className="students-filter">
                <span className="sr-only">{t.studentClassFilter}</span>
                <select value={targetFilter} onChange={(event) => setTargetFilter(event.target.value)}>
                  <option value="all">{t.allStudentsAndClasses}</option>
                  {targets.map(([value, name]) => <option value={value} key={value}>{name}</option>)}
                </select>
              </label>
            </div>
          </div>

          {loading ? (
            <div className="students-loading" role="status">
              <span className="student-loading-spinner" aria-hidden="true" />
              <span>{t.loadingLearningRecords}</span>
            </div>
          ) : loadError ? (
            <div className="students-empty-state learning-error-state" role="alert">
              <span className="students-empty-icon"><Icon name="clipboard" /></span>
              <h3>{t.learningRecordsLoadFailed}</h3>
            </div>
          ) : visibleRecords.length > 0 ? (
            <div className="learning-record-list">
              {visibleRecords.map((record) => {
                const targetName = record.targetType === "individual"
                  ? studentsById.get(record.targetId)?.fullName ?? t.student
                  : classesById.get(record.targetId)?.className ?? t.groupClass;
                const session = sessionsById.get(record.sessionId);
                const warning = attendanceMessage(record);
                const subject = session?.subject ?? record.subject;
                return (
                  <article className="learning-record-card" key={record.id}>
                    <div className="learning-record-main">
                      <div className="learning-record-overline">
                        <span className={`learning-type-badge type-${record.targetType}`}>
                          {record.targetType === "individual" ? t.individual : t.groupClass}
                        </span>
                        <span className="learning-record-subject">{subject}</span>
                      </div>
                      <h2>{targetName}</h2>
                      <p className="learning-record-date">{formatDate(session?.date ?? record.date)}</p>
                      <h3>{record.topic}</h3>
                      {record.remarks && <p className="learning-record-remarks">{record.remarks}</p>}
                      {warning && (
                        <p className="learning-attendance-warning" role="note">
                          <Icon name="clipboard" />
                          <span>{warning}</span>
                        </p>
                      )}
                    </div>
                    <div className="learning-record-side">
                      <span className={`learning-progress-badge progress-${record.progress}`}>
                        {t[progressKey(record.progress)]}
                      </span>
                      <div className="learning-record-actions">
                        <button type="button" onClick={() => openEditForm(record)}>{t.edit}</button>
                        <button className="learning-delete-action" type="button" onClick={() => removeRecord(record)}>
                          {t.delete}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="students-empty-state learning-empty-state">
              <span className="students-empty-icon"><Icon name="book" /></span>
              <h3>{filterEmpty ? t.noLearningRecordsFound : t.noLearningRecordsYet}</h3>
              <p>{filterEmpty ? t.noLearningRecordsFoundDescription : t.noLearningRecordsDescription}</p>
              {records.length === 0 && (
                <button className="student-button student-button-primary" type="button" onClick={openAddForm}>
                  <Icon name="plus" />{t.addLearningRecord}
                </button>
              )}
            </div>
          )}
        </section>
      </div>

      {formOpen && (
        <LearningRecordFormModal
          key={editing?.id ?? "new-learning-record"}
          record={editing}
          sessions={sessions}
          students={students}
          classes={classes}
          onClose={closeForm}
          onSave={saveRecord}
        />
      )}
    </>
  );
}
