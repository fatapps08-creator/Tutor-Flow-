import type { Metadata } from "next";
import { ClassesManager } from "@/src/features/classes/classes-manager";

export const metadata: Metadata = { title: "Classes" };

export default function ClassesPage() {
  return <ClassesManager />;
}
