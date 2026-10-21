"use client";

import { useState, type FormEvent } from "react";
import type { Class } from "@/src/types";
import {
  toClassInput,
  validateClassForm,
  type ClassFormErrors,
  type ClassFormValues,
} from "@/src/features/classes/class-form";
import { Icon } from "@/src/components/ui/icon";
import { getTranslations } from "@/src/i18n";

type ClassFormModalProps = {
  classRecord?: Class;
  onClose: () => void;
  onSave: (values: ClassFormValues) => Promise<void>;
};

function formValues(classRecord?: Class): ClassFormValues {
  return {
    className: classRecord?.className ?? "",
    subject: classRecord?.subject ?? "",
    description: classRecord?.description ?? "",
    status: classRecord?.status ?? "active",
  };
}

export function ClassFormModal({ classRecord, onClose, onSave }: ClassFormModalProps) {
  const t = getTranslations();
  const [values, setValues] = useState(() => formValues(classRecord));
  const [errors, setErrors] = useState<ClassFormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);

  function updateField<K extends keyof ClassFormValues>(field: K, value: ClassFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateClassForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setSubmitError("");
    try {
      await onSave(toClassInput(values));
    } catch {
      setSubmitError(t.classSaveFailed);
      setSaving(false);
    }
  }

  function fieldError(field: keyof ClassFormErrors, message: string) {
    return errors[field] ? (
      <span className="field-error" id={`${field}-error`}>{message}</span>
    ) : null;
  }

  return (
    <div className="student-modal-backdrop">
      <section
        className="student-modal class-form-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="class-form-title"
      >
        <header className="student-modal-header">
          <div>
            <p className="student-modal-eyebrow">{t.classes}</p>
            <h2 id="class-form-title">{classRecord ? t.editClass : t.createClass}</h2>
          </div>
          <button className="student-icon-button" type="button" onClick={onClose} aria-label={t.close}>
            <Icon name="close" />
          </button>
        </header>

        <form className="student-form" onSubmit={handleSubmit} noValidate>
          <div className="student-form-grid">
            <label className="student-field student-field-wide">
              <span>{t.className} <span className="required-mark">*</span></span>
              <input
                autoFocus
                value={values.className}
                onChange={(event) => updateField("className", event.target.value)}
                aria-invalid={Boolean(errors.className)}
                aria-describedby={errors.className ? "className-error" : undefined}
              />
              {fieldError("className", t.classNameRequired)}
            </label>
            <label className="student-field student-field-wide">
              <span>{t.subject} <span className="required-mark">*</span></span>
              <input
                value={values.subject}
                onChange={(event) => updateField("subject", event.target.value)}
                aria-invalid={Boolean(errors.subject)}
                aria-describedby={errors.subject ? "subject-error" : undefined}
              />
              {fieldError("subject", t.classSubjectRequired)}
            </label>
            <label className="student-field student-field-wide">
              <span>{t.description} <span className="optional-label">({t.optional})</span></span>
              <textarea
                rows={3}
                value={values.description}
                onChange={(event) => updateField("description", event.target.value)}
              />
            </label>
            <label className="student-field student-field-wide">
              <span>{t.status}</span>
              <select
                value={values.status}
                onChange={(event) => updateField("status", event.target.value as ClassFormValues["status"])}
              >
                <option value="active">{t.active}</option>
                <option value="archived">{t.archived}</option>
              </select>
            </label>
          </div>

          {submitError && <p className="form-submit-error" role="alert">{submitError}</p>}
          <footer className="student-form-footer">
            <button className="student-button student-button-secondary" type="button" onClick={onClose}>
              {t.cancel}
            </button>
            <button className="student-button student-button-primary" type="submit" disabled={saving}>
              {saving ? t.saving : t.saveClass}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
