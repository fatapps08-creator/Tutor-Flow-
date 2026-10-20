import type { Metadata } from "next";
import { ScheduleManager } from "@/src/features/schedule/schedule-manager";

export const metadata: Metadata = { title: "Schedule" };

export default function SchedulePage() {
  return <ScheduleManager />;
}
