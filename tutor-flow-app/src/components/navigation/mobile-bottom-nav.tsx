"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/src/components/ui/icon";
import { getTranslations } from "@/src/i18n";

const primaryLinks = [
  { href: "/dashboard", key: "dashboard", icon: "home" },
  { href: "/schedule", key: "schedule", icon: "calendar" },
  { href: "/students", key: "students", icon: "users" },
] as const;

const moreLinks = [
  { href: "/learning", key: "learning", icon: "book" },
  { href: "/registration", key: "registration", icon: "clipboard" },
  { href: "/payments", key: "payments", icon: "wallet" },
  { href: "/settings", key: "settings", icon: "settings" },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const t = getTranslations();
  const moreActive = moreLinks.some((item) => item.href === pathname);

  return (
    <div className="mobile-navigation">
      {moreOpen && (
        <button
          className="mobile-menu-backdrop"
          type="button"
          onClick={() => setMoreOpen(false)}
          aria-label={t.closeMoreNavigation}
        />
      )}
      <nav
        className="mobile-more-menu"
        id="mobile-more-menu"
        aria-label={t.more}
        hidden={!moreOpen}
      >
        {moreLinks.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              href={item.href}
              className={`mobile-more-link${active ? " is-active" : ""}`}
              key={item.href}
              onClick={() => setMoreOpen(false)}
              aria-current={active ? "page" : undefined}
            >
              <Icon name={item.icon} />
              <span>{t[item.key]}</span>
              <Icon name="arrowRight" className="more-link-arrow" />
            </Link>
          );
        })}
      </nav>

      <nav className="mobile-bottom-bar" aria-label="Mobile navigation">
        {primaryLinks.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              href={item.href}
              className={`mobile-nav-link${active ? " is-active" : ""}`}
              key={item.href}
              aria-current={active ? "page" : undefined}
            >
              <Icon name={item.icon} />
              <span>{t[item.key]}</span>
            </Link>
          );
        })}
        <button
          className={`mobile-nav-link${moreActive || moreOpen ? " is-active" : ""}`}
          type="button"
          onClick={() => setMoreOpen((open) => !open)}
          aria-expanded={moreOpen}
          aria-controls="mobile-more-menu"
          aria-label={moreOpen ? t.closeMoreNavigation : t.openMoreNavigation}
        >
          <Icon name="more" />
          <span>{t.more}</span>
        </button>
      </nav>
    </div>
  );
}
