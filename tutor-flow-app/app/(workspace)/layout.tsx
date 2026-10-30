import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/src/components/layout/app-shell";
import { getCurrentUser } from "@/src/features/auth/session";

export const instant = false;

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?error=not-authorized");

  return <AppShell>{children}</AppShell>;
}
