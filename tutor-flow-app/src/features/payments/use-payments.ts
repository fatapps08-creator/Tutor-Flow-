"use client";

import { useSyncExternalStore } from "react";
import {
  getPaymentsServerSnapshot,
  getPaymentsSnapshot,
  subscribeToPayments,
} from "@/src/features/payments/payment-service";

export function usePayments() {
  return useSyncExternalStore(
    subscribeToPayments,
    getPaymentsSnapshot,
    getPaymentsServerSnapshot,
  );
}
