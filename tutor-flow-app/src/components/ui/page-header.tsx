"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { getTranslations } from "@/src/i18n";

type PageHeaderProps = {
  title: ReactNode;
  description: string;
  eyebrow?: string;
  dynamicGreeting?: boolean;
  greetingName?: string;
};

function greetingKey(hour: number) {
  if (hour < 12) return "goodMorning";
  if (hour < 18) return "goodAfternoon";
  return "goodEvening";
}

function subscribeToHourChange(onChange: () => void) {
  const interval = window.setInterval(onChange, 60_000);
  return () => window.clearInterval(interval);
}

function getCurrentHour() {
  return new Date().getHours();
}

export function PageHeader({
  title,
  description,
  eyebrow,
  dynamicGreeting = false,
  greetingName,
}: PageHeaderProps) {
  const hour = useSyncExternalStore(
    subscribeToHourChange,
    getCurrentHour,
    () => 0,
  );
  const t = getTranslations();

  return (
    <header className="page-header">
      {eyebrow && <p className="page-eyebrow">{eyebrow}</p>}
      <h1>
        {dynamicGreeting ? (
          <>
            {t[greetingKey(hour)]},{" "}
            <span className="greeting-name">{greetingName}</span>
          </>
        ) : (
          title
        )}
      </h1>
      <p className="page-description">{description}</p>
    </header>
  );
}
