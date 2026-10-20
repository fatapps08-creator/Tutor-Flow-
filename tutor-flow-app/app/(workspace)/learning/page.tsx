import type { Metadata } from "next";
import { PlaceholderPage } from "@/src/components/ui/placeholder-page";

export const metadata: Metadata = { title: "Learning" };

export default function LearningPage() {
  return <PlaceholderPage page="learning" icon="book" />;
}
