import type { Payment } from "@/src/types";
import { initialPayments } from "@/src/features/students/mock-data";
import { getStudentProfile } from "@/src/features/students/student-service";
import { getSettingsSnapshot } from "@/src/features/settings/settings-service";

export type PaymentInput = Pick<
  Payment,
  "studentId" | "amount" | "billingMonth" | "status"
> & Partial<Pick<Payment, "paidAt" | "referenceNote">>;

let payments = [...initialPayments];
let snapshot = payments;
const serverSnapshot = initialPayments;
const listeners = new Set<() => void>();

function notify() {
  snapshot = payments;
  listeners.forEach((listener) => listener());
}

function cleanOptional(value?: string) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function validatePayment(input: PaymentInput, currentPayment?: Payment) {
  if (!input.studentId) {
    throw new Error("A student is required.");
  }
  const profile = getStudentProfile(input.studentId);
  if (!profile) {
    throw new Error("The selected student could not be found.");
  }
  if (profile.student.status !== "active"
    && (!currentPayment || currentPayment.studentId !== input.studentId)) {
    throw new Error("Choose an active student.");
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("The amount must be greater than zero.");
  }
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.billingMonth)) {
    throw new Error("Choose a valid billing month.");
  }
  if (!["paid", "pending", "overdue"].includes(input.status)) {
    throw new Error("Choose a valid payment status.");
  }
  if (input.status === "paid" && !/^\d{4}-\d{2}-\d{2}$/.test(input.paidAt ?? "")) {
    throw new Error("A paid date is required for paid payments.");
  }
}

function normalizeInput(input: PaymentInput) {
  return {
    ...input,
    paidAt: input.status === "paid" ? input.paidAt : undefined,
    referenceNote: cleanOptional(input.referenceNote),
  };
}

export function subscribeToPayments(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPaymentsSnapshot() {
  return snapshot;
}

export function getPaymentsServerSnapshot() {
  return serverSnapshot;
}

export function listPayments() {
  return payments;
}

export function createPayment(input: PaymentInput) {
  validatePayment(input);
  const payment: Payment = {
    ...normalizeInput(input),
    id: `payment-${crypto.randomUUID()}`,
    tutorId: "tutor-demo",
    currency: getSettingsSnapshot().currency,
  };
  payments = [payment, ...payments];
  notify();
  return payment;
}

export function updatePayment(paymentId: string, input: PaymentInput) {
  const existing = payments.find((payment) => payment.id === paymentId);
  if (!existing) {
    throw new Error(`Payment ${paymentId} was not found.`);
  }
  validatePayment(input, existing);

  const updated: Payment = {
    ...existing,
    ...normalizeInput(input),
  };
  payments = payments.map((payment) => (payment.id === paymentId ? updated : payment));
  notify();
  return updated;
}
