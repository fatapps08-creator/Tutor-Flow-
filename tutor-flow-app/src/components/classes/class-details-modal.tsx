"use client";

import { useState } from "react";
import type { Class, ClassStudent, Student } from "@/src/types";
import { Icon } from "@/src/components/ui/icon";
import { getTranslations } from "@/src/i18n";

type AddResult = "added" | "reactivated" | "already-active";

type ClassDetailsModalProps = {
  classRecord: Class;
  memberships: ClassStudent[];
  students: Student[];
  onClose: () => void;
  onRemove: (membership: ClassStudent, student: Student) => void;
  onAdd: (studentIds: string[]) => Promise<AddResult[]>;
};

function formatDate(date: string) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date.slice(0, 10)}T00:00:00`));
}

export function ClassDetailsModal({
  classRecord,
  memberships,
  students,
  onClose,
  onRemove,
  onAdd,
}: ClassDetailsModalProps) {
  const t = getTranslations();
  const [addingStudents, setAddingStudents] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [membershipFeedback, setMembershipFeedback] = useState("");
  const [membershipError, setMembershipError] = useState("");
  const studentById = new Map(students.map((student) => [student.id, student]));
  const activeMemberships = memberships.filter((membership) => membership.status === "active");

  function toggleStudent(studentId: string) {
    setSelectedStudentIds((current) => (
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId]
    ));
  }

  async function addSelectedStudents() {
    setMembershipError("");
    setMembershipFeedback("");
    try {
      const results = await onAdd(selectedStudentIds);
      const added = results.filter((result) => result === "added").length;
      const reactivated = results.filter((result) => result === "reactivated").length;
      const duplicates = results.filter((result) => result === "already-active").length;
      const messages = [
        added > 0 && t.studentsAddedToClass.replace("{count}", String(added)),
        reactivated > 0 && t.classMembershipsReactivated.replace("{count}", String(reactivated)),
        duplicates > 0 && t.duplicateClassMemberships.replace("{count}", String(duplicates)),
      ].filter(Boolean);
      setMembershipFeedback(messages.join(" "));
      setSelectedStudentIds([]);
      setAddingStudents(false);
    } catch {
      setMembershipError(t.classMembershipSaveFailed);
    }
  }

  return (
    <div className="student-modal-backdrop">
      <section
        className="student-modal class-details-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="class-details-title"
      >
        <header className="student-modal-header">
          <div className="class-details-heading">
            <p className="student-modal-eyebrow">{t.classDetails}</p>
            <h2 id="class-details-title">{classRecord.className}</h2>
          </div>
          <button className="student-icon-button" type="button" onClick={onClose} aria-label={t.close}>
            <Icon name="close" />
          </button>
        </header>

        <div className="class-details-content">
          <dl className="student-information-grid class-information-grid">
            <div><dt>{t.subject}</dt><dd>{classRecord.subject}</dd></div>
            <div><dt>{t.status}</dt><dd><span className={`student-status status-${classRecord.status}`}>{t[classRecord.status]}</span></dd></div>
            <div><dt>{t.createdDate}</dt><dd>{formatDate(classRecord.createdAt)}</dd></div>
            <div><dt>{t.activeStudents}</dt><dd>{activeMemberships.length}</dd></div>
            {classRecord.description && <div className="student-information-wide"><dt>{t.description}</dt><dd>{classRecord.description}</dd></div>}
          </dl>

          <section className="class-members-section" aria-labelledby="class-students-title">
            <div className="student-profile-section-heading">
              <div className="class-members-title">
                <h3 id="class-students-title">{t.studentsInClass}</h3>
                <span className="student-section-count">{activeMemberships.length}</span>
              </div>
              <button
                className="student-button student-button-secondary class-add-student-button"
                type="button"
                onClick={() => {
                  setAddingStudents((open) => !open);
                  setMembershipFeedback("");
                  setMembershipError("");
                }}
              >
                <Icon name={addingStudents ? "close" : "plus"} />
                {addingStudents ? t.cancel : t.addStudentToClass}
              </button>
            </div>

            {membershipFeedback && <p className="class-inline-feedback" role="status">{membershipFeedback}</p>}
            {membershipError && <p className="class-inline-feedback feedback-error" role="alert">{membershipError}</p>}

            {addingStudents && (
              <div className="class-student-picker">
                <p>{t.chooseStudentsForClass}</p>
                <div className="class-student-options">
                  {students.map((student) => {
                    const existingMembership = memberships.find(
                      (membership) => membership.studentId === student.id,
                    );
                    const isActiveMember = existingMembership?.status === "active";
                    return (
                      <label className={`class-student-option${isActiveMember ? " is-member" : ""}`} key={student.id}>
                        <input
                          type="checkbox"
                          checked={isActiveMember || selectedStudentIds.includes(student.id)}
                          disabled={isActiveMember}
                          onChange={() => toggleStudent(student.id)}
                        />
                        <span className="student-list-avatar" aria-hidden="true">{student.fullName.charAt(0).toUpperCase()}</span>
                        <span className="student-name-copy">
                          <strong>{student.fullName}</strong>
                          <span>{student.subjects.length ? student.subjects.join(", ") : "—"}</span>
                        </span>
                        <span className={`student-status status-${student.status}`}>{t[student.status]}</span>
                        {existingMembership?.status === "inactive" && (
                          <span className="class-reactivate-hint">{t.reactivateMembership}</span>
                        )}
                        {isActiveMember && <span className="class-member-hint">{t.alreadyInClass}</span>}
                      </label>
                    );
                  })}
                  {students.length === 0 && <p className="class-picker-empty">{t.noStudentsToAdd}</p>}
                </div>
                <div className="class-picker-actions">
                  <button
                    className="student-button student-button-primary"
                    type="button"
                    onClick={addSelectedStudents}
                    disabled={selectedStudentIds.length === 0}
                  >
                    {t.addSelectedStudents}
                  </button>
                </div>
              </div>
            )}

            {memberships.length === 0 ? (
              <p className="student-profile-empty">{t.noClassStudentsYet}</p>
            ) : (
              <div className="class-members-list">
                {memberships.map((membership) => {
                  const student = studentById.get(membership.studentId);
                  if (!student) return null;
                  return (
                    <article className={`class-member-row${membership.status === "inactive" ? " is-inactive" : ""}`} key={membership.id}>
                      <span className="student-list-avatar" aria-hidden="true">{student.fullName.charAt(0).toUpperCase()}</span>
                      <div className="class-member-copy">
                        <strong>{student.fullName}</strong>
                        <span>{student.subjects.length ? student.subjects.join(", ") : "—"}</span>
                      </div>
                      <div className="class-member-state">
                        <small>{t.studentStatus}</small>
                        <span className={`student-status status-${student.status}`}>{t[student.status]}</span>
                      </div>
                      <div className="class-member-state">
                        <small>{t.membershipStatus}</small>
                        <span className={`student-status status-${membership.status}`}>{t[membership.status]}</span>
                      </div>
                      <span className="class-member-date">{formatDate(membership.joinedDate)}</span>
                      {membership.status === "active" && (
                        <button
                          className="class-remove-member"
                          type="button"
                          onClick={() => onRemove(membership, student)}
                        >
                          {t.removeFromClass}
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
