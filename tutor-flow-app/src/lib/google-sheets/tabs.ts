import type { GoogleSheetTabName } from "@/src/types";

export const GOOGLE_SHEET_TABS = {
  tutors: "Tutors",
  students: "Students",
  registrations: "Registrations",
  sessions: "Sessions",
  learningRecords: "Learning Records",
  attendance: "Attendance",
  payments: "Payments",
  settings: "Settings",
  classes: "Classes",
  classStudents: "ClassStudents",
} as const satisfies Record<string, GoogleSheetTabName>;

export const GOOGLE_SHEET_TAB_NAMES = Object.values(GOOGLE_SHEET_TABS);

export function isGoogleSheetTabName(value: string): value is GoogleSheetTabName {
  return (GOOGLE_SHEET_TAB_NAMES as readonly string[]).includes(value);
}
