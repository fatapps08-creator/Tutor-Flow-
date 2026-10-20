"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/src/components/ui/icon";
import { getTranslations } from "@/src/i18n";

const navigation = [
  { href: "/dashboard", key: "dashboard", icon: "grid" },
  { href: "/schedule", key: "schedule", icon: "calendar" },
  { href: "/students", key: "students", icon: "users" },
  { href: "/learning", key: "learning", icon: "book" },
  { href: "/registration", key: "registration", icon: "clipboard" },
  { href: "/payments", key: "payments", icon: "wallet" },
  { href: "/settings", key: "settings", icon: "settings" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const t = getTranslations();

  return (
    <aside className="desktop-sidebar">
      <Link className="brand-lockup" href="/dashboard" aria-label="Tutor Flow home">
        <span className="brand-mark">t</span>
        <span className="brand-name">tutor<span>flow</span></span>
      </Link>

      <p className="sidebar-label">{t.dashboardOverview}</p>
      <nav className="sidebar-navigation" aria-label="Main navigation">
        {navigation.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              className={`navigation-link${active ? " is-active" : ""}`}
              href={item.href}
              key={item.href}
              aria-current={active ? "page" : undefined}
            >
              <Icon name={item.icon as IconName} className="navigation-icon" />
              <span>{t[item.key]}</span>
              {item.key === "registration" && (
                <span className="navigation-count" aria-label="3 pending">
                  3
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-tip">
          <span className="tip-icon"><Icon name="sparkles" /></span>
          <p>{t.sidebarTip}</p>
          <span className="tip-caption">{t.sidebarTipCaption}</span>
        </div>
        <div className="profile-chip">
          <span className="avatar avatar-sidebar" aria-hidden="true">S</span>
          <span className="profile-copy">
            <strong>Sarah</strong>
            <span>{t.independentTutor}</span>
          </span>
          <Icon name="more" className="profile-more" />
        </div>
      </div>
    </aside>
  );
}
