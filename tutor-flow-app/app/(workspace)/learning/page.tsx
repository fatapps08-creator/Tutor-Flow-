import type { Metadata } from "next";
import { LearningManager } from "@/src/features/learning/learning-manager";

export const metadata: Metadata = { title: "Learning Records" };

export default function LearningPage() {
  return <LearningManager />;
}
