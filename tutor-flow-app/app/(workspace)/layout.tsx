import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/src/components/layout/app-shell";
import { AuthenticationRequiredError } from "@/src/features/auth/session";
import {
  requireTenantContext,
  TenantContextUnavailableError,
} from "@/src/features/authorization/tenant-context";

export const instant = false;

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  try {
    await requireTenantContext();
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) redirect("/login?error=not-authorized");
    if (error instanceof TenantContextUnavailableError) redirect("/login?error=tenant-unavailable");
    throw error;
  }

  return <AppShell>{children}</AppShell>;
}
