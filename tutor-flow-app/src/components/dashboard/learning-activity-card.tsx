import Link from "next/link";
import type { LearningProgress, LearningRecord } from "@/src/types";
import { demoStudentNames } from "@/src/data/dashboard";
import { Icon } from "@/src/components/ui/icon";
import { getTranslations } from "@/src/i18n";

const progressLabels: Record<LearningProgress, "excellent" | "good" | "improving" | "needsAttention"> = {
  excellent: "excellent",
  good: "good",
  improving: "improving",
  needs_attention: "needsAttention",
};

export function LearningActivityCard({ records }: { records: LearningRecord[] }) {
  const t = getTranslations();

  return (
    <section className="content-card activity-card" aria-labelledby="activity-title">
      <div className="content-card-header">
        <div>
          <p className="section-eyebrow">{t.dashboardOverview}</p>
          <h2 id="activity-title">{t.recentLearning}</h2>
        </div>
        <Link
          className="icon-link"
          href="/learning"
          aria-label={`${t.viewAll} ${t.learning.toLowerCase()}`}
        >
          <Icon name="arrowRight" />
        </Link>
      </div>
      {records.length === 0 ? (
        <div className="card-empty-state">
          <span className="empty-icon"><Icon name="book" /></span>
          <p>{t.noLearningRecords}</p>
        </div>
      ) : (
        <ul className="activity-list">
          {records.map((record) => (
            <li className="activity-row" key={record.id}>
              <span className="activity-marker"><Icon name="check" /></span>
              <div className="activity-details">
                <strong>{demoStudentNames[record.studentId] ?? t.student}</strong>
                <span>{record.subject} <span className="activity-separator">/</span> {record.topic}</span>
                <span className={`progress-tag progress-${record.progress}`}>
                  {t[progressLabels[record.progress]]}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
