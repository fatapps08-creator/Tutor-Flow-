import type { Metadata } from "next";
import { PaymentsManager } from "@/src/features/payments/payments-manager";

export const metadata: Metadata = { title: "Payments" };

export default function PaymentsPage() {
  return <PaymentsManager />;
}
