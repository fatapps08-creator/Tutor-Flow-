"use client";

import { useState, type FormEvent } from "react";
import type { Class, Registration, RegistrationType } from "@/src/types";
import type { RegistrationInput } from "@/src/features/registration/registration-service";
import { Icon } from "@/src/components/ui/icon";
import { getTranslations } from "@/src/i18n";

type RegistrationFormErrors = Partial<
  Record<"studentName" | "requestedSubject" | "preferredClassId", string>
>;

type RegistrationFormModalProps = {
  registration?: Registration;
  activeClasses: Class[];
  onClose: () => void;
  onSave: (values: RegistrationInput) => Promise<void>;
};

function formValues(registration?: Registration): RegistrationInput {
  return {
    studentName: registration?.studentName ?? "",
    requestedSubject: registration?.requestedSubject ?? "",
    registrationType: registration?.registrationType ?? "individual",
    guardianName: registration?.guardianName ?? "",
    guardianPhone: registration?.guardianPhone ?? "",
    preferredSchedule: registration?.preferredSchedule ?? "",
    preferredClassId: registration?.preferredClassId ?? "",
    notes: registration?.notes ?? "",
  };
}

export function RegistrationFormModal({
  registration,
  activeClasses,
  onClose,
  onSave,
}: RegistrationFormModalProps) {
  const t = getTranslations();
  const [values, setValues] = useState(() => formValues(registration));
  const [errors, setErrors] = useState<RegistrationFormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedClass = activeClasses.find((item) => item.id === values.preferredClassId);

  function updateField<K extends keyof RegistrationInput>(field: K, value: RegistrationInput[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError("");
  }

  function updateType(value: RegistrationType) {
    setValues((current) => ({
      ...current,
      registrationType: value,
      preferredClassId: value === "group" ? current.preferredClassId : "",
      requestedSubject: value === "group" ? "" : current.requestedSubject,
    }));
    setErrors({});
    setSubmitError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: RegistrationFormErrors = {};
    if (!values.studentName.trim()) nextErrors.studentName = "required";
    if (values.registrationType === "individual" && !values.requestedSubject.trim()) {
      nextErrors.requestedSubject = "required";
    }
    if (values.registrationType === "group" && !selectedClass) {
      nextErrors.preferredClassId = "required";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setSubmitError("");
    try {
      await onSave({
        ...values,
        requestedSubject: selectedClass?.subject ?? values.requestedSubject,
        ...(values.registrationType === "group"
          ? { preferredClassId: selectedClass?.id ?? "" }
          : { preferredClassId: undefined }),
      });
    } catch {
      setSubmitError(t.registrationSaveFailed);
      setSaving(false);
    }
  }

  function fieldError(field: keyof RegistrationFormErrors, message: string) {
    return errors[field] ? (
      <span className="field-error" id={`registration-${field}-error`}>{message}</span>
    ) : null;
  }

  return (
    <div className="student-modal-backdrop">
      <section
        className="student-modal registration-form-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="registration-form-title"
      >
        <header className="student-modal-header">
          <div>
            <p className="student-modal-eyebrow">{t.registration}</p>
            <h2 id="registration-form-title">
              {registration ? t.editRegistration : t.addRegistration}
            </h2>
          </div>
          <button className="student-icon-button" type="button" onClick={onClose} aria-label={t.close}>
            <Icon name="close" />
          </button>
        </header>

        <form className="student-form" onSubmit={handleSubmit} noValidate>
          <div className="student-form-grid">
            <label className="student-field student-field-wide">
              <span>{t.registrationStudentName} <span className="required-mark">*</span></span>
              <input
                autoFocus
                autoComplete="name"
                value={values.studentName}
                onChange={(event) => updateField("studentName", event.target.value)}
                aria-invalid={Boolean(errors.studentName)}
                aria-describedby={errors.studentName ? "registration-studentName-error" : undefined}
              />
              {fieldError("studentName", t.registrationStudentRequired)}
            </label>

            <label className="student-field student-field-wide">
              <span>{t.registrationType} <span className="required-mark">*</span></span>
              <select
                value={values.registrationType}
                onChange={(event) => updateType(event.target.value as RegistrationType)}
              >
                <option value="individual">{t.individual}</option>
                <option value="group">{t.groupClass}</option>
              </select>
            </label>

            {values.registrationType === "group" ? (
              <>
                <label className="student-field student-field-wide">
                  <span>{t.selectActiveClass} <span className="required-mark">*</span></span>
                  <select
                    value={values.preferredClassId ?? ""}
                    onChange={(event) => {
                      const classRecord = activeClasses.find((item) => item.id === event.target.value);
                      setValues((current) => ({
                        ...current,
                        preferredClassId: event.target.value,
                        requestedSubject: classRecord?.subject ?? "",
                      }));
                      setErrors((current) => ({ ...current, preferredClassId: undefined }));
                      setSubmitError("");
                    }}
                    aria-invalid={Boolean(errors.preferredClassId)}
                    aria-describedby={errors.preferredClassId ? "registration-preferredClassId-error" : undefined}
                  >
                    <option value="">{t.selectClass}</option>
                    {activeClasses.map((classRecord) => (
                      <option value={classRecord.id} key={classRecord.id}>{classRecord.className}</option>
                    ))}
                  </select>
                  {activeClasses.length === 0 && (
                    <span className="field-hint">{t.noActiveClasses}</span>
                  )}
                  {fieldError("preferredClassId", t.registrationClassRequired)}
                </label>
                {selectedClass ? (
                  <div className="registration-selected-class student-field student-field-wide" aria-live="polite">
                    <span>{t.selectedClassDetails}</span>
                    <strong>{selectedClass.className}</strong>
                    <span>{t.subject}: {selectedClass.subject}</span>
                  </div>
                ) : (
                  <div className="student-field student-field-wide">
                    <span>{t.requestedSubject}</span>
                    <span className="field-hint">{t.groupSubjectFromClass}</span>
                  </div>
                )}
              </>
            ) : (
              <label className="student-field student-field-wide">
                <span>{t.requestedSubject} <span className="required-mark">*</span></span>
                <input
                  value={values.requestedSubject}
                  onChange={(event) => updateField("requestedSubject", event.target.value)}
                  aria-invalid={Boolean(errors.requestedSubject)}
                  aria-describedby={errors.requestedSubject ? "registration-requestedSubject-error" : undefined}
                />
                {fieldError("requestedSubject", t.registrationSubjectRequired)}
              </label>
            )}

            <label className="student-field">
              <span>{t.guardian} <span className="optional-label">({t.optional})</span></span>
              <input
                autoComplete="name"
                value={values.guardianName ?? ""}
                onChange={(event) => updateField("guardianName", event.target.value)}
              />
            </label>

            <label className="student-field">
              <span>{t.phone} <span className="optional-label">({t.optional})</span></span>
              <input
                autoComplete="tel"
                inputMode="tel"
                value={values.guardianPhone ?? ""}
                onChange={(event) => updateField("guardianPhone", event.target.value)}
              />
            </label>

            <label className="student-field student-field-wide">
              <span>{t.preferredSchedule} <span className="optional-label">({t.optional})</span></span>
              <input
                value={values.preferredSchedule ?? ""}
                onChange={(event) => updateField("preferredSchedule", event.target.value)}
              />
            </label>

            <label className="student-field student-field-wide">
              <span>{t.notes} <span className="optional-label">({t.optional})</span></span>
              <textarea
                rows={3}
                value={values.notes ?? ""}
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
              {saving ? t.saving : t.saveRegistration}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
