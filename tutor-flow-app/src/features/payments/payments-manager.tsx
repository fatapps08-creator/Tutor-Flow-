"use client";

import { useEffect, useMemo, useState } from "react";
import type { Payment, PaymentStatus } from "@/src/types";
import { PaymentFormModal } from "@/src/components/payments/payment-form-modal";
import { Icon } from "@/src/components/ui/icon";
import { getTranslations } from "@/src/i18n";
import { useStudents } from "@/src/features/students/use-students";
import { useSettings } from "@/src/features/settings/use-settings";
import {
  createPayment,
  listPayments,
  updatePayment,
  type PaymentInput,
} from "@/src/features/payments/payment-service";
import { usePayments } from "@/src/features/payments/use-payments";

type PaymentStatusFilter = "all" | PaymentStatus;

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(amount);
}

function formatBillingMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" })
    .format(new Date(year, monthNumber - 1, 1, 12));
}

function formatDate(date: string) {
  if (!date) return "—";
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date.slice(0, 10)}T12:00:00`));
}

function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const t = getTranslations();
  return <span className={`student-status status-${status}`}>{t[status]}</span>;
}

export function PaymentsManager() {
  const t = getTranslations();
  const payments = usePayments();
  const settings = useSettings();
  const studentProfiles = useStudents();
  const students = useMemo(
    () => studentProfiles.map(({ student }) => student),
    [studentProfiles],
  );
  const activeStudents = useMemo(
    () => students.filter((student) => student.status === "active"),
    [students],
  );
  const studentById = useMemo(
    () => new Map(students.map((student) => [student.id, student])),
    [students],
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter>("all");
  const [billingMonthFilter, setBillingMonthFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Payment>();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string }>();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        listPayments();
        setLoading(false);
      } catch {
        setLoadError(true);
        setLoading(false);
      }
    }, 180);
    return () => window.clearTimeout(timeout);
  }, []);

  const visiblePayments = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return payments.filter((payment) => {
      const studentName = studentById.get(payment.studentId)?.fullName ?? "";
      return (!query || studentName.toLocaleLowerCase().includes(query))
        && (statusFilter === "all" || payment.status === statusFilter)
        && (!billingMonthFilter || payment.billingMonth === billingMonthFilter);
    });
  }, [billingMonthFilter, payments, search, statusFilter, studentById]);

  function openAddForm() {
    setEditing(undefined);
    setFormOpen(true);
    setFeedback(undefined);
  }

  function openEditForm(payment: Payment) {
    setEditing(payment);
    setFormOpen(true);
    setFeedback(undefined);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(undefined);
  }

  async function savePayment(values: PaymentInput) {
    try {
      if (editing) {
        updatePayment(editing.id, values);
        setFeedback({ type: "success", message: t.paymentUpdated });
      } else {
        createPayment(values);
        setFeedback({ type: "success", message: t.paymentAdded });
      }
      closeForm();
    } catch (error) {
      setFeedback({ type: "error", message: t.paymentSaveFailed });
      throw error;
    }
  }

  function retryLoad() {
    setLoading(true);
    setLoadError(false);
    window.setTimeout(() => {
      try {
        listPayments();
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }, 120);
  }

  const paymentActions = (payment: Payment) => (
    <div className="payment-actions">
      <button type="button" onClick={() => openEditForm(payment)}>{t.edit}</button>
    </div>
  );

  return (
    <>
      <div className="page-container payments-page">
        <header className="page-header students-page-header payments-page-header">
          <div>
            <p className="page-eyebrow">{t.dashboardOverview}</p>
            <h1>{t.payments}</h1>
            <p className="page-description">{t.paymentsPageDescription}</p>
          </div>
          <button
            className="student-button student-button-primary add-student-button"
            type="button"
            onClick={openAddForm}
          >
            <Icon name="plus" />
            {t.addPayment}
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

        <section className="students-panel payments-panel" aria-label={t.payments} aria-busy={loading}>
          <div className="students-panel-header payments-panel-header">
            <div>
              <h2>{t.paymentRecords}</h2>
              <p>{visiblePayments.length} {t.paymentCount}</p>
            </div>
            <div className="students-controls payments-controls">
              <label className="students-search payments-search">
                <Icon name="search" />
                <span className="sr-only">{t.searchPayments}</span>
                <input
                  type="search"
                  placeholder={t.searchPaymentsHint}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <label className="students-filter">
                <span className="sr-only">{t.filterPaymentsByStatus}</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as PaymentStatusFilter)}
                >
                  <option value="all">{t.allPayments}</option>
                  <option value="paid">{t.paid}</option>
                  <option value="pending">{t.pending}</option>
                  <option value="overdue">{t.overdue}</option>
                </select>
              </label>
              <label className="payments-month-filter">
                <span className="sr-only">{t.filterPaymentsByMonth}</span>
                <input
                  type="month"
                  value={billingMonthFilter}
                  onChange={(event) => setBillingMonthFilter(event.target.value)}
                />
              </label>
            </div>
          </div>

          {loading ? (
            <div className="students-loading" role="status">
              <span className="student-loading-spinner" aria-hidden="true" />
              <span>{t.loadingPayments}</span>
            </div>
          ) : loadError ? (
            <div className="payments-empty-state" role="alert">
              <h3>{t.paymentLoadFailed}</h3>
              <button className="student-button student-button-secondary" type="button" onClick={retryLoad}>
                {t.tryAgain}
              </button>
            </div>
          ) : visiblePayments.length > 0 ? (
            <>
              <div className="payments-table-wrap">
                <table className="payments-table">
                  <thead>
                    <tr>
                      <th scope="col">{t.paymentStudent}</th>
                      <th scope="col">{t.paymentAmount}</th>
                      <th scope="col">{t.billingMonth}</th>
                      <th scope="col">{t.paymentStatus}</th>
                      <th scope="col">{t.paidDate}</th>
                      <th scope="col">{t.referenceNote}</th>
                      <th scope="col"><span className="sr-only">{t.actions}</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiblePayments.map((payment) => (
                      <tr key={payment.id}>
                        <td><strong>{studentById.get(payment.studentId)?.fullName ?? t.student}</strong></td>
                        <td>{formatAmount(payment.amount, payment.currency)}</td>
                        <td>{formatBillingMonth(payment.billingMonth)}</td>
                        <td><PaymentStatusBadge status={payment.status} /></td>
                        <td>{payment.paidAt ? formatDate(payment.paidAt) : "—"}</td>
                        <td className="payment-reference">{payment.referenceNote || "—"}</td>
                        <td>{paymentActions(payment)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="payments-mobile-list">
                {visiblePayments.map((payment) => (
                  <article className="payments-mobile-card" key={payment.id}>
                    <div className="payments-mobile-heading">
                      <strong>{studentById.get(payment.studentId)?.fullName ?? t.student}</strong>
                      <PaymentStatusBadge status={payment.status} />
                    </div>
                    <dl>
                      <div><dt>{t.paymentAmount}</dt><dd>{formatAmount(payment.amount, payment.currency)}</dd></div>
                      <div><dt>{t.billingMonth}</dt><dd>{formatBillingMonth(payment.billingMonth)}</dd></div>
                      <div><dt>{t.paidDate}</dt><dd>{payment.paidAt ? formatDate(payment.paidAt) : "—"}</dd></div>
                      <div><dt>{t.referenceNote}</dt><dd>{payment.referenceNote || "—"}</dd></div>
                    </dl>
                    {paymentActions(payment)}
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="payments-empty-state">
              <span className="payments-empty-icon"><Icon name="wallet" /></span>
              <h3>{payments.length === 0 ? t.noPaymentRecordsYet : t.noPaymentsFound}</h3>
              <p>{payments.length === 0 ? t.noPaymentsDescription : t.noPaymentsFoundDescription}</p>
              {payments.length === 0 ? (
                <button className="student-button student-button-primary" type="button" onClick={openAddForm}>
                  <Icon name="plus" />{t.addPayment}
                </button>
              ) : (
                <button
                  className="student-button student-button-secondary"
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setBillingMonthFilter("");
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
        <PaymentFormModal
          key={editing?.id ?? "new-payment"}
          payment={editing}
          students={activeStudents.concat(
            editing && !activeStudents.some((student) => student.id === editing.studentId)
              ? students.filter((student) => student.id === editing.studentId)
              : [],
          )}
          defaultCurrency={settings.currency}
          onClose={closeForm}
          onSave={savePayment}
        />
      )}
    </>
  );
}
