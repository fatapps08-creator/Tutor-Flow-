"use client";

import { useState, type FormEvent } from "react";
import type { StudentStatus } from "@/src/types";
import type { StudentFormErrors, StudentFormValues } from "@/src/features/students/student-form";
import { validateStudentForm } from "@/src/features/students/student-form";
import { Icon } from "@/src/components/ui/icon";
import { getTranslations } from "@/src/i18n";
import type { StudentProfile } from "@/src/features/students/mock-data";

type StudentFormModalProps = {
  profile?: StudentProfile;
  onClose: () => void;
  onSave: (values: StudentFormValues) => Promise<void>;
};

function formValues(profile?: StudentProfile): StudentFormValues {
  const student = profile?.student;
  return {
    fullName: student?.fullName ?? "",
    guardianName: student?.guardianName ?? "",
    guardianPhone: student?.guardianPhone ?? "",
    email: profile?.contact.email ?? "",
    dateOfBirth: profile?.contact.dateOfBirth ?? "",
    address: profile?.contact.address ?? "",
    subjects: student?.subjects.join(", ") ?? "",
    gradeOrLevel: student?.gradeOrLevel ?? "",
    notes: student?.notes ?? "",
    status: student?.status ?? "active",
  };
}

export function StudentFormModal({ profile, onClose, onSave }: StudentFormModalProps) {
  const t = getTranslations();
  const [values, setValues] = useState(() => formValues(profile));
  const [errors, setErrors] = useState<StudentFormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);

  function updateField<K extends keyof StudentFormValues>(field: K, value: StudentFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateStudentForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setSubmitError("");
    try {
      await onSave(values);
    } catch {
      setSubmitError(t.saveFailed);
      setSaving(false);
    }
  }

  function fieldError(field: keyof StudentFormValues, message: string) {
    return errors[field] ? (
      <span className="field-error" id={`${field}-error`}>
        {message}
      </span>
    ) : null;
  }

  return (
    <div className="student-modal-backdrop">
      <section
        className="student-modal student-form-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-form-title"
      >
        <header className="student-modal-header">
          <div>
            <p className="student-modal-eyebrow">{t.studentInformation}</p>
            <h2 id="student-form-title">{profile ? t.editStudentTitle : t.addStudentTitle}</h2>
          </div>
          <button className="student-icon-button" type="button" onClick={onClose} aria-label={t.close}>
          <Icon name="close" />
          </button>
        </header>

        <form className="student-form" onSubmit={handleSubmit} noValidate>
          <div className="student-form-grid">
            <label className="student-field student-field-wide">
              <span>{t.fullName} <span className="required-mark">*</span></span>
              <input
                autoFocus
                autoComplete="name"
                value={values.fullName}
                onChange={(event) => updateField("fullName", event.target.value)}
                aria-invalid={Boolean(errors.fullName)}
                aria-describedby={errors.fullName ? "fullName-error" : undefined}
              />
              {fieldError("fullName", t.requiredField)}
            </label>

            <label className="student-field">
              <span>{t.guardian} <span className="optional-label">({t.optional})</span></span>
              <input
                autoComplete="name"
                value={values.guardianName}
                onChange={(event) => updateField("guardianName", event.target.value)}
              />
            </label>

            <label className="student-field">
              <span>{t.phone} <span className="optional-label">({t.optional})</span></span>
              <input
                autoComplete="tel"
                inputMode="tel"
                value={values.guardianPhone}
                onChange={(event) => updateField("guardianPhone", event.target.value)}
              />
            </label>

            <label className="student-field">
              <span>{t.email} <span className="optional-label">({t.optional})</span></span>
              <input
                type="email"
                autoComplete="email"
                value={values.email}
                onChange={(event) => updateField("email", event.target.value)}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              {fieldError("email", t.invalidEmail)}
            </label>

            <label className="student-field">
              <span>{t.dateOfBirth} <span className="optional-label">({t.optional})</span></span>
              <input
                type="date"
                value={values.dateOfBirth}
                onChange={(event) => updateField("dateOfBirth", event.target.value)}
                aria-invalid={Boolean(errors.dateOfBirth)}
                aria-describedby={errors.dateOfBirth ? "dateOfBirth-error" : undefined}
              />
              {fieldError("dateOfBirth", t.futureDate)}
            </label>

            <label className="student-field student-field-wide">
              <span>{t.address} <span className="optional-label">({t.optional})</span></span>
              <input
                autoComplete="street-address"
                value={values.address}
                onChange={(event) => updateField("address", event.target.value)}
              />
            </label>

            <label className="student-field student-field-wide">
              <span>{t.subjects} <span className="optional-label">({t.optional})</span></span>
              <input
                value={values.subjects}
                placeholder={t.subjectsPlaceholder}
                onChange={(event) => updateField("subjects", event.target.value)}
                aria-describedby="subjects-help"
              />
              <span className="field-hint" id="subjects-help">{t.subjectsHint}</span>
            </label>

            <label className="student-field">
              <span>{t.gradeLevel} <span className="optional-label">({t.optional})</span></span>
              <input
                value={values.gradeOrLevel}
                onChange={(event) => updateField("gradeOrLevel", event.target.value)}
              />
            </label>

            <label className="student-field">
              <span>{t.status}</span>
              <select
                value={values.status}
                onChange={(event) => updateField("status", event.target.value as StudentStatus)}
              >
                <option value="active">{t.active}</option>
                <option value="inactive">{t.inactive}</option>
                <option value="paused">{t.paused}</option>
              </select>
            </label>

            <label className="student-field student-field-wide">
              <span>{t.notes} <span className="optional-label">({t.optional})</span></span>
              <textarea
                rows={3}
                value={values.notes}
                onChange={(event) => updateField("notes", event.target.value)}
              />
            </label>
          </div>

          {submitError && <p className="form-submit-error" role="alert">{submitError}</p>}
          <footer className="student-form-footer">
            <button className="student-button student-button-secondary" type="button" onClick={onClose}>
              {t.cancel}
            </button>
            <button className="student-button student-button-primary" type="submit" disabled={saving}>
              {saving ? t.saving : t.saveStudent}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
