"use client";

import { useMemo, useState } from "react";
import type { StudentStatus } from "@/src/types";
import {
  type StudentProfile,
  initialAttendance,
  initialLearningRecords,
  initialPayments,
  initialSessions,
} from "@/src/features/students/mock-data";
import {
  toStudentSubmission,
  type StudentFormValues,
} from "@/src/features/students/student-form";
import { StudentFormModal } from "@/src/components/students/student-form-modal";
import { StudentProfileModal } from "@/src/components/students/student-profile-modal";
import {
  StudentSearch,
  StudentStatusFilter,
  StudentsList,
} from "@/src/components/students/students-list";
import { Icon } from "@/src/components/ui/icon";
import { getTranslations } from "@/src/i18n";
import {
  createStudentInSheets,
  loadStudentsFromApi,
  updateStudentInSheets,
  updateStudentStatusInSheets,
} from "@/src/features/students/student-service";
import { useStudents, useStudentsLoadState } from "@/src/features/students/use-students";

type StatusFilter = "all" | StudentStatus;

export function StudentsManager() {
  const t = getTranslations();
  const students = useStudents();
  const loadState = useStudentsLoadState();
  const [sessions] = useState(initialSessions);
  const [learningRecords] = useState(initialLearningRecords);
  const [attendance] = useState(initialAttendance);
  const [payments] = useState(initialPayments);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StudentProfile>();
  const [viewing, setViewing] = useState<StudentProfile>();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string }>();

  const loading = loadState.status === "idle" || loadState.status === "loading";

  const visibleStudents = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return students.filter(({ student }) => {
      const matchesName = !query || student.fullName.toLocaleLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || student.status === statusFilter;
      return matchesName && matchesStatus;
    });
  }, [search, statusFilter, students]);

  function openAddForm() {
    setEditing(undefined);
    setFormOpen(true);
    setFeedback(undefined);
  }

  function openEditForm(profile: StudentProfile) {
    setViewing(undefined);
    setEditing(profile);
    setFormOpen(true);
    setFeedback(undefined);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(undefined);
  }

  async function saveStudent(values: StudentFormValues) {
    try {
      const result = toStudentSubmission(values, editing?.student);
      if (editing) {
        await updateStudentInSheets(editing.student.id, result);
        setFeedback({ type: "success", message: t.studentSaved });
      } else {
        await createStudentInSheets(result);
        setFeedback({ type: "success", message: t.studentAdded });
      }
      closeForm();
    } catch {
      setFeedback({ type: "error", message: t.saveFailed });
      throw new Error(t.saveFailed);
    }
  }

  async function archiveStudent(profile: StudentProfile) {
    if (!window.confirm(`${t.archiveConfirmation}\n\n${profile.student.fullName}`)) return;

    try {
      await updateStudentStatusInSheets(profile.student.id, "inactive");
      setFeedback({ type: "success", message: t.studentArchived });
    } catch {
      setFeedback({ type: "error", message: t.archiveFailed });
    }
  }

  async function restoreStudent(profile: StudentProfile) {
    if (!window.confirm(`${t.restoreConfirmation}\n\n${profile.student.fullName}`)) return;

    try {
      await updateStudentStatusInSheets(profile.student.id, "active");
      setFeedback({ type: "success", message: t.studentRestored });
    } catch {
      setFeedback({ type: "error", message: t.archiveFailed });
    }
  }

  function viewStudent(profile: StudentProfile) {
    setViewing(profile);
    setFeedback(undefined);
  }

  return (
    <>
      <div className="page-container students-page">
        <header className="page-header students-page-header">
          <div>
            <p className="page-eyebrow">{t.dashboardOverview}</p>
            <h1>{t.students}</h1>
            <p className="page-description">{t.studentsPageDescription}</p>
          </div>
          <button className="student-button student-button-primary add-student-button" type="button" onClick={openAddForm}>
            <Icon name="plus" />
            {t.addStudent}
          </button>
        </header>

        {feedback && (
          <div className={`student-feedback feedback-${feedback.type}`} role={feedback.type === "error" ? "alert" : "status"}>
            <Icon name={feedback.type === "success" ? "check" : "clipboard"} />
            <span>{feedback.message}</span>
            <button type="button" onClick={() => setFeedback(undefined)} aria-label={t.close}>
              <Icon name="more" />
            </button>
          </div>
        )}

        <section className="students-panel" aria-label={t.students} aria-busy={loading}>
          <div className="students-panel-header">
            <div>
              <h2>{t.students}</h2>
              <p>{visibleStudents.length} {t.studentCount}</p>
            </div>
            <div className="students-controls">
              <StudentSearch value={search} onChange={setSearch} />
              <StudentStatusFilter value={statusFilter} onChange={setStatusFilter} />
            </div>
          </div>

          {loading ? (
            <div className="students-loading" role="status">
              <span className="student-loading-spinner" aria-hidden="true" />
              <span>{t.loadingStudents}</span>
            </div>
          ) : loadState.status === "error" ? (
            <div className="students-empty-state" role="alert">
              <span className="students-empty-icon"><Icon name="users" /></span>
              <h3>{t.studentsLoadFailed}</h3>
              <p>{t.studentsLoadFailedDescription}</p>
              <button
                className="student-button student-button-secondary"
                type="button"
                onClick={() => void loadStudentsFromApi()}
              >
                {t.tryAgain}
              </button>
            </div>
          ) : visibleStudents.length > 0 ? (
            <StudentsList
              students={visibleStudents}
              onView={viewStudent}
              onEdit={openEditForm}
              onArchive={archiveStudent}
              onRestore={restoreStudent}
            />
          ) : (
            <div className="students-empty-state">
              <span className="students-empty-icon"><Icon name="users" /></span>
              <h3>{students.length === 0 ? t.noStudentsYet : t.noStudentsFound}</h3>
              <p>{students.length === 0 ? t.noStudentsDescription : t.noStudentsFoundDescription}</p>
              {students.length === 0 ? (
                <button className="student-button student-button-primary" type="button" onClick={openAddForm}>
                  <Icon name="plus" />{t.addFirstStudent}
                </button>
              ) : (
                <button
                  className="student-button student-button-secondary"
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                  }}
                >
                  {t.clearFilters}
                </button>
              )}
            </div>
          )}
        </section>
      </div>

      {formOpen && (
        <StudentFormModal
          key={editing?.student.id ?? "new-student"}
          profile={editing}
          onClose={closeForm}
          onSave={saveStudent}
        />
      )}

      {viewing && (
        <StudentProfileModal
          profile={viewing}
          sessions={sessions}
          learningRecords={learningRecords}
          attendance={attendance}
          payments={payments}
          onClose={() => setViewing(undefined)}
          onEdit={() => openEditForm(viewing)}
        />
      )}
    </>
  );
}
