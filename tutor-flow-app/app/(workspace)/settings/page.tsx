import type { Metadata } from "next";
import { PlaceholderPage } from "@/src/components/ui/placeholder-page";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return <PlaceholderPage page="settings" icon="settings" />;
}
