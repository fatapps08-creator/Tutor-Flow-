import type { Metadata } from "next";
import { SettingsManager } from "@/src/features/settings/settings-manager";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return <SettingsManager />;
}
