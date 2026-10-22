"use client";

import { useState, type FormEvent } from "react";
import type { Payment, PaymentStatus, Student } from "@/src/types";
import type { PaymentInput } from "@/src/features/payments/payment-service";
import { Icon } from "@/src/components/ui/icon";
import { getTranslations } from "@/src/i18n";

type PaymentFormValues = {
  studentId: string;
  amount: string;
  billingMonth: string;
  status: PaymentStatus;
  paidAt: string;
  referenceNote: string;
};

type PaymentFormErrors = Partial<
  Record<"studentId" | "amount" | "billingMonth" | "paidAt", string>
>;

type PaymentFormModalProps = {
  payment?: Payment;
  students: Student[];
  defaultCurrency: string;
  onClose: () => void;
  onSave: (values: PaymentInput) => Promise<void>;
};

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function formValues(payment?: Payment): PaymentFormValues {
  return {
    studentId: payment?.studentId ?? "",
    amount: payment?.amount.toString() ?? "",
    billingMonth: payment?.billingMonth ?? currentMonth(),
    status: payment?.status ?? "pending",
    paidAt: payment?.paidAt ?? today(),
    referenceNote: payment?.referenceNote ?? "",
  };
}

export function PaymentFormModal({
  payment,
  students,
  defaultCurrency,
  onClose,
  onSave,
}: PaymentFormModalProps) {
  const t = getTranslations();
  const [values, setValues] = useState(() => formValues(payment));
  const [errors, setErrors] = useState<PaymentFormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);

  function updateField<K extends keyof PaymentFormValues>(field: K, value: PaymentFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: PaymentFormErrors = {};
    const amount = Number(values.amount);
    if (!values.studentId) nextErrors.studentId = "required";
    if (!values.amount.trim()) nextErrors.amount = "required";
    else if (!Number.isFinite(amount) || amount <= 0) nextErrors.amount = "invalid";
    if (!values.billingMonth) nextErrors.billingMonth = "required";
    if (values.status === "paid" && !values.paidAt) nextErrors.paidAt = "required";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setSubmitError("");
    try {
      await onSave({
        studentId: values.studentId,
        amount,
        billingMonth: values.billingMonth,
        status: values.status,
        ...(values.status === "paid" && { paidAt: values.paidAt }),
        ...(values.referenceNote.trim() && { referenceNote: values.referenceNote.trim() }),
      });
    } catch {
      setSubmitError(t.paymentSaveFailed);
      setSaving(false);
    }
  }

  function fieldError(field: keyof PaymentFormErrors, message: string) {
    return errors[field] ? (
      <span className="field-error" id={`payment-${field}-error`}>{message}</span>
    ) : null;
  }

  return (
    <div className="student-modal-backdrop">
      <section
        className="student-modal payment-form-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-form-title"
      >
        <header className="student-modal-header">
          <div>
            <p className="student-modal-eyebrow">{t.payments}</p>
            <h2 id="payment-form-title">{payment ? t.editPayment : t.addPayment}</h2>
          </div>
          <button className="student-icon-button" type="button" onClick={onClose} aria-label={t.close}>
            <Icon name="close" />
          </button>
        </header>

        <form className="student-form" onSubmit={handleSubmit} noValidate>
          <div className="student-form-grid">
            <label className="student-field student-field-wide">
              <span>{t.paymentStudent} <span className="required-mark">*</span></span>
              <select
                value={values.studentId}
                onChange={(event) => updateField("studentId", event.target.value)}
                aria-invalid={Boolean(errors.studentId)}
                aria-describedby={errors.studentId ? "payment-studentId-error" : undefined}
              >
                <option value="">{t.chooseStudent}</option>
                {students.map((student) => (
                  <option value={student.id} key={student.id}>
                    {student.fullName}{student.status === "active" ? "" : ` (${t[student.status]})`}
                  </option>
                ))}
              </select>
              {students.length === 0 && <span className="field-hint">{t.noActiveStudentsForPayments}</span>}
              {fieldError("studentId", t.paymentStudentRequired)}
            </label>

            <label className="student-field">
              <span>{t.paymentAmount} <span className="required-mark">*</span></span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={values.amount}
                onChange={(event) => updateField("amount", event.target.value)}
                aria-invalid={Boolean(errors.amount)}
                aria-describedby={errors.amount ? "payment-amount-error" : undefined}
              />
              {fieldError("amount", errors.amount === "invalid" ? t.paymentAmountInvalid : t.paymentAmountRequired)}
            </label>

            <label className="student-field">
              <span>{t.paymentCurrency}</span>
              <input value={payment?.currency ?? defaultCurrency} readOnly />
            </label>

            <label className="student-field">
              <span>{t.billingMonth} <span className="required-mark">*</span></span>
              <input
                type="month"
                value={values.billingMonth}
                onChange={(event) => updateField("billingMonth", event.target.value)}
                aria-invalid={Boolean(errors.billingMonth)}
                aria-describedby={errors.billingMonth ? "payment-billingMonth-error" : undefined}
              />
              {fieldError("billingMonth", t.paymentMonthRequired)}
            </label>

            <label className="student-field">
              <span>{t.paymentStatus} <span className="required-mark">*</span></span>
              <select
                value={values.status}
                onChange={(event) => updateField("status", event.target.value as PaymentStatus)}
              >
                <option value="paid">{t.paid}</option>
                <option value="pending">{t.pending}</option>
                <option value="overdue">{t.overdue}</option>
              </select>
            </label>

            {values.status === "paid" && (
              <label className="student-field student-field-wide">
                <span>{t.paidDate} <span className="required-mark">*</span></span>
                <input
                  type="date"
                  value={values.paidAt}
                  onChange={(event) => updateField("paidAt", event.target.value)}
                  aria-invalid={Boolean(errors.paidAt)}
                  aria-describedby={errors.paidAt ? "payment-paidAt-error" : undefined}
                />
                {fieldError("paidAt", t.paymentPaidDateRequired)}
              </label>
            )}

            <label className="student-field student-field-wide">
              <span>{t.referenceNote} <span className="optional-label">({t.optional})</span></span>
              <textarea
                rows={3}
                value={values.referenceNote}
                onChange={(event) => updateField("referenceNote", event.target.value)}
              />
            </label>
          </div>

          {submitError && <p className="form-submit-error" role="alert">{submitError}</p>}
          <footer className="student-form-footer">
            <button className="student-button student-button-secondary" type="button" onClick={onClose}>
              {t.cancel}
            </button>
            <button className="student-button student-button-primary" type="submit" disabled={saving}>
              {saving ? t.saving : t.savePayment}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
