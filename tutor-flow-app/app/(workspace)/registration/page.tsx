import type { Metadata } from "next";
import { PlaceholderPage } from "@/src/components/ui/placeholder-page";

export const metadata: Metadata = { title: "Registration" };

export default function RegistrationPage() {
  return <PlaceholderPage page="registration" icon="clipboard" />;
}
