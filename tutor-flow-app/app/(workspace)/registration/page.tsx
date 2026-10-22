import type { Metadata } from "next";
import { RegistrationManager } from "@/src/features/registration/registration-manager";

export const metadata: Metadata = { title: "Registration" };

export default function RegistrationPage() {
  return <RegistrationManager />;
}
