import type { ReactNode } from "react";
import { AppShell } from "@/src/components/layout/app-shell";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
