"use client";

import {
  LearningActivityCard,
  QuickActionCard,
  ScheduleCard,
  SummaryCard,
} from "@/src/components/dashboard";
import { PageHeader } from "@/src/components/ui/page-header";
import { dashboardData } from "@/src/data/dashboard";
import { getTranslations } from "@/src/i18n";
import { useSessions } from "@/src/features/schedule/use-sessions";
import { useTodayDate } from "@/src/features/schedule/use-today";

export function DashboardContent() {
  const t = getTranslations();
  const sessions = useSessions();
  const today = useTodayDate();
  const todaysSchedule = sessions.filter((session) => session.date === today);
  const summaryCards = [
    {
      label: t.todaySessions,
      value: todaysSchedule.length.toString(),
      detail: t.sessionsScheduled,
      icon: "calendar" as const,
      tone: "blue" as const,
    },
    {
      label: t.activeStudents,
      value: dashboardData.activeStudentsCount.toString(),
      detail: t.studentsLearning,
      icon: "users" as const,
      tone: "violet" as const,
    },
    {
      label: t.pendingRegistrations,
      value: dashboardData.pendingRegistrationsCount.toString(),
      detail: t.awaitingReview,
      icon: "clipboard" as const,
      tone: "amber" as const,
    },
    {
      label: t.monthlyPayments,
      value: dashboardData.monthlyPaymentsFormatted,
      detail: t.collectedThisMonth,
      icon: "wallet" as const,
      tone: "green" as const,
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title={t.dashboard}
        greetingName={dashboardData.tutorName}
        dynamicGreeting
        description={t.dashboardIntro}
        eyebrow={t.dashboardOverview}
      />

      <section className="summary-grid" aria-label={t.dashboardSummary}>
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </section>

      <section className="dashboard-content-grid" aria-label={t.todaysOverview}>
        <ScheduleCard sessions={todaysSchedule} />
        <LearningActivityCard records={dashboardData.recentLearningActivity} />
      </section>

      <section className="quick-actions-section" aria-labelledby="quick-actions-title">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">{t.makeProgress}</p>
            <h2 id="quick-actions-title">{t.quickActions}</h2>
          </div>
        </div>
        <div className="quick-actions-grid">
          <QuickActionCard
            href="/students"
            icon="userPlus"
            title={t.addStudent}
            description={t.addStudentDescription}
            tone="violet"
          />
          <QuickActionCard
            href="/schedule"
            icon="calendarPlus"
            title={t.createSession}
            description={t.createSessionDescription}
            tone="blue"
          />
          <QuickActionCard
            href="/learning"
            icon="bookPlus"
            title={t.addLearningRecord}
            description={t.addLearningDescription}
            tone="green"
          />
          <QuickActionCard
            href="/registration"
            icon="clipboard"
            title={t.viewRegistrations}
            description={t.viewRegistrationsDescription}
            tone="amber"
          />
        </div>
      </section>
    </div>
  );
}
