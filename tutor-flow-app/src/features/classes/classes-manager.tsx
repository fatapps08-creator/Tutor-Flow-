"use client";

import { useEffect, useMemo, useState } from "react";
import type { Class, ClassStatus, ClassStudent, Student } from "@/src/types";
import { useStudents } from "@/src/features/students/use-students";
import { ClassDetailsModal } from "@/src/components/classes/class-details-modal";
import { ClassFormModal } from "@/src/components/classes/class-form-modal";
import { Icon } from "@/src/components/ui/icon";
import { getTranslations } from "@/src/i18n";
import {
  addStudentToClass,
  createClass,
  loadClasses,
  removeStudentFromClass,
  updateClass,
  updateClassStatus,
  type ClassInput,
} from "@/src/features/classes/class-service";
import { useClasses } from "@/src/features/classes/use-classes";

type ClassStatusFilter = "all" | ClassStatus;

function formatDate(date: string) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date.slice(0, 10)}T00:00:00`));
}

function classConfirmationMessage(classRecord: Class, action: "archive" | "reactivate", t: ReturnType<typeof getTranslations>) {
  return action === "archive"
    ? t.archiveClassConfirmation.replace("{name}", classRecord.className)
    : t.reactivateClassConfirmation.replace("{name}", classRecord.className);
}

export function ClassesManager() {
  const t = getTranslations();
  const { classes, classStudents } = useClasses();
  const studentProfiles = useStudents();
  const students = useMemo<Student[]>(
    () => studentProfiles.map(({ student }) => student),
    [studentProfiles],
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClassStatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Class>();
  const [viewing, setViewing] = useState<Class>();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string }>();

  useEffect(() => {
    loadClasses().catch(() => setFeedback({ type: "error", message: t.classSaveFailed })).finally(() => setLoading(false));
  }, [t.classSaveFailed]);

  const visibleClasses = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return classes.filter((classRecord) => {
      const matchesName = !query || classRecord.className.toLocaleLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || classRecord.status === statusFilter;
      return matchesName && matchesStatus;
    });
  }, [classes, search, statusFilter]);

  function openCreateForm() {
    setEditing(undefined);
    setFormOpen(true);
    setFeedback(undefined);
  }

  function openEditForm(classRecord: Class) {
    setEditing(classRecord);
    setFormOpen(true);
    setFeedback(undefined);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(undefined);
  }

  async function saveClass(values: ClassInput) {
    try {
      if (editing) {
        await updateClass(editing.id, values);
        setFeedback({ type: "success", message: t.classSaved });
      } else {
        await createClass(values);
        setFeedback({ type: "success", message: t.classCreated });
      }
      closeForm();
    } catch (error) {
      setFeedback({ type: "error", message: t.classSaveFailed });
      throw error;
    }
  }

  async function changeClassStatus(classRecord: Class) {
    const nextStatus: ClassStatus = classRecord.status === "active" ? "archived" : "active";
    const action = nextStatus === "archived" ? "archive" : "reactivate";
    if (!window.confirm(classConfirmationMessage(classRecord, action, t))) return;

    try {
      await updateClassStatus(classRecord.id, nextStatus);
      setFeedback({
        type: "success",
        message: nextStatus === "archived" ? t.classArchived : t.classReactivated,
      });
    } catch {
      setFeedback({ type: "error", message: t.classStatusUpdateFailed });
    }
  }

  async function removeMembership(membership: ClassStudent, student: Student) {
    if (!window.confirm(t.removeClassMembershipConfirmation.replace("{name}", student.fullName))) return;
    try {
      await removeStudentFromClass(membership.id);
      setFeedback({ type: "success", message: t.studentRemovedFromClass });
    } catch {
      setFeedback({ type: "error", message: t.classMembershipSaveFailed });
    }
  }

  async function addMemberships(classId: string, studentIds: string[]) {
    return Promise.all(studentIds.map((studentId) => addStudentToClass(classId, studentId)));
  }

  return (
    <>
      <div className="page-container classes-page">
        <header className="page-header students-page-header classes-page-header">
          <div className="page-header">
            <p className="page-eyebrow">{t.dashboardOverview}</p>
            <h1>{t.classes}</h1>
            <p className="page-description">{t.classesPageDescription}</p>
          </div>
          <button className="student-button student-button-primary add-student-button" type="button" onClick={openCreateForm}>
            <Icon name="plus" />
            {t.createClass}
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

        <section className="students-panel classes-panel" aria-label={t.classes} aria-busy={loading}>
          <div className="students-panel-header">
            <div>
              <h2>{t.classes}</h2>
              <p>{visibleClasses.length} {t.classCount}</p>
            </div>
            <div className="students-controls">
              <label className="students-search">
                <Icon name="search" />
                <span className="sr-only">{t.searchClasses}</span>
                <input
                  type="search"
                  value={search}
                  placeholder={t.searchClassesHint}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <label className="students-filter">
                <span className="sr-only">{t.status}</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as ClassStatusFilter)}
                >
                  <option value="all">{t.allClasses}</option>
                  <option value="active">{t.active}</option>
                  <option value="archived">{t.archived}</option>
                </select>
              </label>
            </div>
          </div>

          {loading ? (
            <div className="students-loading" role="status">
              <span className="student-loading-spinner" aria-hidden="true" />
              <span>{t.loadingClasses}</span>
            </div>
          ) : visibleClasses.length > 0 ? (
            <div className="class-card-grid">
              {visibleClasses.map((classRecord) => {
                const activeStudentCount = classStudents.filter(
                  (membership) => membership.classId === classRecord.id && membership.status === "active",
                ).length;
                return (
                  <article className="class-card" key={classRecord.id}>
                    <div className="class-card-header">
                      <button
                        className="class-name-button"
                        type="button"
                        onClick={() => setViewing(classRecord)}
                      >
                        <span className="class-card-icon"><Icon name="users" /></span>
                        <span>
                          <strong>{classRecord.className}</strong>
                          <small>{classRecord.subject}</small>
                        </span>
                      </button>
                      <span className={`student-status status-${classRecord.status}`}>{t[classRecord.status]}</span>
                    </div>
                    {classRecord.description && <p className="class-card-description">{classRecord.description}</p>}
                    <div className="class-card-meta">
                      <span><Icon name="users" />{activeStudentCount} {t.activeStudentCountLabel}</span>
                      <span>{t.createdDate}: {formatDate(classRecord.createdAt)}</span>
                    </div>
                    <div className="class-card-actions">
                      <button type="button" onClick={() => setViewing(classRecord)}>{t.viewDetails}</button>
                      <button type="button" onClick={() => openEditForm(classRecord)}>{t.edit}</button>
                      <button
                        className={classRecord.status === "active" ? "class-action-archive" : "class-action-reactivate"}
                        type="button"
                        onClick={() => changeClassStatus(classRecord)}
                      >
                        {classRecord.status === "active" ? t.archive : t.reactivateClass}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="students-empty-state">
              <span className="students-empty-icon"><Icon name="users" /></span>
              <h3>{classes.length === 0 ? t.noClassesYet : t.noClassesFound}</h3>
              <p>{classes.length === 0 ? t.noClassesDescription : t.noClassesFoundDescription}</p>
              {classes.length === 0 ? (
                <button className="student-button student-button-primary" type="button" onClick={openCreateForm}>
                  <Icon name="plus" />{t.createFirstClass}
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
        <ClassFormModal
          key={editing?.id ?? "new-class"}
          classRecord={editing}
          onClose={closeForm}
          onSave={saveClass}
        />
      )}

      {viewing && (
        <ClassDetailsModal
          classRecord={viewing}
          memberships={classStudents.filter((membership) => membership.classId === viewing.id)}
          students={students}
          onClose={() => setViewing(undefined)}
          onRemove={removeMembership}
          onAdd={(studentIds) => addMemberships(viewing.id, studentIds)}
        />
      )}
    </>
  );
}
