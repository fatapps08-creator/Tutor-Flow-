import type { ReactNode } from "react";
import Link from "next/link";
import { MobileBottomNav } from "@/src/components/navigation/mobile-bottom-nav";
import { Sidebar } from "@/src/components/navigation/sidebar";
import { getTranslations } from "@/src/i18n";

export function AppShell({ children }: { children: ReactNode }) {
  const t = getTranslations();

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <header className="mobile-topbar">
          <Link className="brand-lockup" href="/dashboard" aria-label="Tutor Flow home">
            <span className="brand-mark">t</span>
            <span className="brand-name">tutor<span>flow</span></span>
          </Link>
          <div className="mobile-user">
            <span className="mobile-date-label">{t.dashboardOverview}</span>
            <span className="avatar" aria-label="Sarah">S</span>
          </div>
        </header>
        <main className="main-content">{children}</main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
