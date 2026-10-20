import type { Metadata } from "next";
import { PlaceholderPage } from "@/src/components/ui/placeholder-page";

export const metadata: Metadata = { title: "Payments" };

export default function PaymentsPage() {
  return <PlaceholderPage page="payments" icon="wallet" />;
}
