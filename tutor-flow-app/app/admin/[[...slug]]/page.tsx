import type { Metadata } from "next";
import { AdminPanel } from "@/src/features/admin/admin-panel";

export const metadata: Metadata = { title: "Admin Panel", description: "Fadigihub Admin Panel untuk mengurus Tutor Flow." };
export const instant = false;

export default async function AdminPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  return <AdminPanel slug={slug} />;
}
