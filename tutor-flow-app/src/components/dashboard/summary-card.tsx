import { Icon, type IconName } from "@/src/components/ui/icon";

type SummaryCardProps = {
  label: string;
  value: string;
  detail: string;
  icon: IconName;
  tone: "blue" | "violet" | "amber" | "green";
};

export function SummaryCard({ label, value, detail, icon, tone }: SummaryCardProps) {
  return (
    <article className="summary-card">
      <div className={`summary-icon tone-${tone}`}>
        <Icon name={icon} />
      </div>
      <p className="summary-label">{label}</p>
      <p className="summary-value">{value}</p>
      <p className="summary-detail">{detail}</p>
    </article>
  );
}
