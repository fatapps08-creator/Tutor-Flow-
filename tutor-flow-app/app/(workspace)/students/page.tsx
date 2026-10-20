import type { Metadata } from "next";
import { StudentsManager } from "@/src/features/students/students-manager";

export const metadata: Metadata = { title: "Students" };

export default function StudentsPage() {
  return <StudentsManager />;
}
