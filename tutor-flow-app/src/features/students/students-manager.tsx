"use client";

import { useEffect, useMemo, useState } from "react";
import type { StudentStatus } from "@/src/types";
import {
  initialAttendance,
  initialLearningRecords,
  initialPayments,
  initialSessions,
  initialStudents,
  type StudentProfile,
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

type StatusFilter = "all" | StudentStatus;

export function StudentsManager() {
  const t = getTranslations();
  const [students, setStudents] = useState<StudentProfile[]>(initialStudents);
  const [sessions] = useState(initialSessions);
  const [learningRecords] = useState(initialLearningRecords);
  const [attendance] = useState(initialAttendance);
  const [payments] = useState(initialPayments);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StudentProfile>();
  const [viewing, setViewing] = useState<StudentProfile>();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string }>();

  useEffect(() => {
    const timeout = window.setTimeout(() => setLoading(false), 280);
    return () => window.clearTimeout(timeout);
  }, []);

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
        setStudents((current) => current.map((profile) => (
          profile.student.id === editing.student.id
            ? { student: result.student, contact: result.contact }
            : profile
        )));
        setFeedback({ type: "success", message: t.studentSaved });
      } else {
        setStudents((current) => [{ student: result.student, contact: result.contact }, ...current]);
        setFeedback({ type: "success", message: t.studentAdded });
      }
      closeForm();
    } catch {
      setFeedback({ type: "error", message: t.saveFailed });
      throw new Error(t.saveFailed);
    }
  }

  function archiveStudent(profile: StudentProfile) {
    if (!window.confirm(`${t.archiveConfirmation}\n\n${profile.student.fullName}`)) return;

    try {
      setStudents((current) => current.map((item) => (
        item.student.id === profile.student.id
          ? { ...item, student: { ...item.student, status: "inactive" } }
          : item
      )));
      setFeedback({ type: "success", message: t.studentArchived });
    } catch {
      setFeedback({ type: "error", message: t.archiveFailed });
    }
  }

  function restoreStudent(profile: StudentProfile) {
    if (!window.confirm(`${t.restoreConfirmation}\n\n${profile.student.fullName}`)) return;

    try {
      setStudents((current) => current.map((item) => (
        item.student.id === profile.student.id
          ? { ...item, student: { ...item.student, status: "active" } }
          : item
      )));
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
