"use client";

import { useEffect, useMemo, useState } from "react";
import type { Registration, RegistrationStatus } from "@/src/types";
import { RegistrationFormModal } from "@/src/components/registration/registration-form-modal";
import { Icon } from "@/src/components/ui/icon";
import { getTranslations } from "@/src/i18n";
import {
  approveRegistration,
  createRegistration,
  listRegistrations,
  rejectRegistration,
  updateRegistration,
  type RegistrationInput,
} from "@/src/features/registration/registration-service";
import { useRegistrations } from "@/src/features/registration/use-registrations";
import { useClasses } from "@/src/features/classes/use-classes";
import { useStudents } from "@/src/features/students/use-students";

type RegistrationStatusFilter = "all" | RegistrationStatus;

function formatDate(date: string) {
  if (!date) return "—";
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function statusLabel(status: RegistrationStatus, t: ReturnType<typeof getTranslations>) {
  if (status === "approved") return t.approved;
  if (status === "rejected") return t.rejected;
  return t.pending;
}

function RegistrationStatusBadge({ status }: { status: RegistrationStatus }) {
  const t = getTranslations();
  return (
    <span className={`registration-status registration-status-${status}`}>
      {statusLabel(status, t)}
    </span>
  );
}

export function RegistrationManager() {
  const t = getTranslations();
  const registrations = useRegistrations();
  const { classes } = useClasses();
  const students = useStudents();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RegistrationStatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Registration>();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string }>();

  const activeClasses = useMemo(
    () => classes.filter((classRecord) => classRecord.status === "active"),
    [classes],
  );
  const classById = useMemo(
    () => new Map(classes.map((classRecord) => [classRecord.id, classRecord])),
    [classes],
  );
  const studentById = useMemo(
    () => new Map(students.map(({ student }) => [student.id, student])),
    [students],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        listRegistrations();
        setLoading(false);
      } catch {
        setLoadError(true);
        setLoading(false);
      }
    }, 180);
    return () => window.clearTimeout(timeout);
  }, []);

  const visibleRegistrations = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return registrations.filter((registration) => {
      const className = registration.preferredClassId
        ? classById.get(registration.preferredClassId)?.className ?? ""
        : "";
      const matchesQuery = !query || [
        registration.studentName,
        registration.requestedSubject,
        registration.guardianName ?? "",
        registration.guardianPhone ?? "",
        registration.preferredSchedule ?? "",
        className,
      ].some((value) => value.toLocaleLowerCase().includes(query));
      return matchesQuery
        && (statusFilter === "all" || registration.status === statusFilter);
    });
  }, [classById, registrations, search, statusFilter]);

  function openAddForm() {
    setEditing(undefined);
    setFormOpen(true);
    setFeedback(undefined);
  }

  function openEditForm(registration: Registration) {
    setEditing(registration);
    setFormOpen(true);
    setFeedback(undefined);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(undefined);
  }

  async function saveRegistration(values: RegistrationInput) {
    try {
      if (editing) {
        updateRegistration(editing.id, values);
        setFeedback({ type: "success", message: t.registrationUpdated });
      } else {
        createRegistration(values);
        setFeedback({ type: "success", message: t.registrationAdded });
      }
      closeForm();
    } catch (error) {
      setFeedback({ type: "error", message: t.registrationSaveFailed });
      throw error;
    }
  }

  function approve(registration: Registration) {
    try {
      const result = approveRegistration(registration.id);
      setFeedback({
        type: "success",
        message: t.registrationApproved.replace("{name}", result.profile.student.fullName),
      });
    } catch {
      setFeedback({ type: "error", message: t.registrationActionFailed });
    }
  }

  function reject(registration: Registration) {
    if (!window.confirm(t.registrationRejectConfirmation.replace("{name}", registration.studentName))) return;
    try {
      rejectRegistration(registration.id);
      setFeedback({ type: "success", message: t.registrationRejected });
    } catch {
      setFeedback({ type: "error", message: t.registrationActionFailed });
    }
  }

  function retryLoad() {
    setLoading(true);
    setLoadError(false);
    window.setTimeout(() => {
      try {
        listRegistrations();
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }, 120);
  }

  const registrationActions = (registration: Registration) => (
    <div className="registration-actions">
      {registration.status === "approved" ? (
        <span className="registration-edit-locked" role="note">
          {t.approvedRegistrationCannotEdit}
        </span>
      ) : (
        <button type="button" onClick={() => openEditForm(registration)}>
          {t.edit}
        </button>
      )}
      {registration.status === "pending" && (
        <>
          <button
            className="registration-action-approve"
            type="button"
            onClick={() => approve(registration)}
          >
            {t.approve}
          </button>
          <button
            className="registration-action-reject"
            type="button"
            onClick={() => reject(registration)}
          >
            {t.reject}
          </button>
        </>
      )}
    </div>
  );

  return (
    <>
      <div className="page-container registration-page">
        <header className="page-header students-page-header registration-page-header">
          <div>
            <p className="page-eyebrow">{t.dashboardOverview}</p>
            <h1>{t.registration}</h1>
            <p className="page-description">{t.registrationPageDescription}</p>
          </div>
          <button
            className="student-button student-button-primary add-student-button"
            type="button"
            onClick={openAddForm}
          >
            <Icon name="plus" />
            {t.addRegistration}
          </button>
        </header>

        {feedback && (
          <div
            className={`student-feedback feedback-${feedback.type}`}
            role={feedback.type === "error" ? "alert" : "status"}
          >
            <Icon name={feedback.type === "success" ? "check" : "clipboard"} />
            <span>{feedback.message}</span>
            <button type="button" onClick={() => setFeedback(undefined)} aria-label={t.close}>
              <Icon name="close" />
            </button>
          </div>
        )}

        <section className="students-panel registration-panel" aria-label={t.registration} aria-busy={loading}>
          <div className="students-panel-header registration-panel-header">
            <div>
              <h2>{t.registrationRequests}</h2>
              <p>{visibleRegistrations.length} {t.registrationCount}</p>
            </div>
            <div className="students-controls registration-controls">
              <label className="students-search registration-search">
                <Icon name="search" />
                <span className="sr-only">{t.searchRegistrations}</span>
                <input
                  type="search"
                  placeholder={t.searchRegistrationsHint}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <label className="students-filter">
                <span className="sr-only">{t.filterRegistrationStatus}</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as RegistrationStatusFilter)}
                >
                  <option value="all">{t.allRegistrations}</option>
                  <option value="pending">{t.pending}</option>
                  <option value="approved">{t.approved}</option>
                  <option value="rejected">{t.rejected}</option>
                </select>
              </label>
            </div>
          </div>

          {loading ? (
            <div className="students-loading" role="status">
              <span className="student-loading-spinner" aria-hidden="true" />
              <span>{t.loadingRegistrations}</span>
            </div>
          ) : loadError ? (
            <div className="registration-empty-state" role="alert">
              <h3>{t.registrationLoadFailed}</h3>
              <button className="student-button student-button-secondary" type="button" onClick={retryLoad}>
                {t.tryAgain}
              </button>
            </div>
          ) : visibleRegistrations.length > 0 ? (
            <>
              <div className="registration-table-wrap">
                <table className="registration-table">
                  <thead>
                    <tr>
                      <th scope="col">{t.registrationStudentName}</th>
                      <th scope="col">{t.requestedSubject}</th>
                      <th scope="col">{t.registrationType}</th>
                      <th scope="col">{t.guardianContact}</th>
                      <th scope="col">{t.submittedDate}</th>
                      <th scope="col">{t.status}</th>
                      <th scope="col"><span className="sr-only">{t.actions}</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRegistrations.map((registration) => {
                      const classRecord = registration.preferredClassId
                        ? classById.get(registration.preferredClassId)
                        : undefined;
                      const linkedStudent = registration.createdStudentId
                        ? studentById.get(registration.createdStudentId)
                        : undefined;
                      return (
                        <tr key={registration.id}>
                          <td>
                            <strong className="registration-student-name">{registration.studentName}</strong>
                            {linkedStudent && (
                              <span className="registration-linked-student">
                                {t.studentCreated}: {linkedStudent.fullName}
                              </span>
                            )}
                          </td>
                          <td>
                            <span className="registration-subject">{registration.requestedSubject}</span>
                            {classRecord && <span className="registration-class-name">{classRecord.className}</span>}
                          </td>
                          <td>
                            <span className={`registration-type registration-type-${registration.registrationType}`}>
                              {registration.registrationType === "individual" ? t.individual : t.groupClass}
                            </span>
                          </td>
                          <td>
                            <span className="registration-guardian-name">{registration.guardianName || "—"}</span>
                            <span className="registration-guardian-phone">{registration.guardianPhone || "—"}</span>
                          </td>
                          <td>{formatDate(registration.submittedAt)}</td>
                          <td><RegistrationStatusBadge status={registration.status} /></td>
                          <td>{registrationActions(registration)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="registration-mobile-list">
                {visibleRegistrations.map((registration) => {
                  const classRecord = registration.preferredClassId
                    ? classById.get(registration.preferredClassId)
                    : undefined;
                  const linkedStudent = registration.createdStudentId
                    ? studentById.get(registration.createdStudentId)
                    : undefined;
                  return (
                    <article className="registration-mobile-card" key={registration.id}>
                      <div className="registration-mobile-heading">
                        <div>
                          <h3>{registration.studentName}</h3>
                          {linkedStudent && <span>{t.studentCreated}: {linkedStudent.fullName}</span>}
                        </div>
                        <RegistrationStatusBadge status={registration.status} />
                      </div>
                      <dl className="registration-mobile-details">
                        <div><dt>{t.requestedSubject}</dt><dd>{registration.requestedSubject}</dd></div>
                        <div>
                          <dt>{t.registrationType}</dt>
                          <dd>{registration.registrationType === "individual" ? t.individual : t.groupClass}</dd>
                        </div>
                        {classRecord && (
                          <div><dt>{t.class}</dt><dd>{classRecord.className} · {classRecord.subject}</dd></div>
                        )}
                        <div>
                          <dt>{t.guardianContact}</dt>
                          <dd>{registration.guardianName || "—"}<br />{registration.guardianPhone || "—"}</dd>
                        </div>
                        <div><dt>{t.submittedDate}</dt><dd>{formatDate(registration.submittedAt)}</dd></div>
                      </dl>
                      {registrationActions(registration)}
                    </article>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="registration-empty-state">
              <span className="registration-empty-icon"><Icon name="clipboard" /></span>
              <h3>{registrations.length === 0 ? t.noRegistrationsYet : t.noRegistrationsFound}</h3>
              <p>
                {registrations.length === 0
                  ? t.noRegistrationsDescription
                  : t.noRegistrationsFoundDescription}
              </p>
              {registrations.length === 0 ? (
                <button className="student-button student-button-primary" type="button" onClick={openAddForm}>
                  <Icon name="plus" />{t.addRegistration}
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
        <RegistrationFormModal
          key={editing?.id ?? "new-registration"}
          registration={editing}
          activeClasses={activeClasses}
          onClose={closeForm}
          onSave={saveRegistration}
        />
      )}
    </>
  );
}
