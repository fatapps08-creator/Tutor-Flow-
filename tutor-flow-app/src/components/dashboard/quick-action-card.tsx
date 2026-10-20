import Link from "next/link";
import { Icon, type IconName } from "@/src/components/ui/icon";

type QuickActionCardProps = {
  href: string;
  icon: IconName;
  title: string;
  description: string;
  tone: "violet" | "blue" | "green" | "amber";
};

export function QuickActionCard({
  href,
  icon,
  title,
  description,
  tone,
}: QuickActionCardProps) {
  return (
    <Link href={href} className="quick-action-card">
      <span className={`quick-action-icon tone-${tone}`}><Icon name={icon} /></span>
      <span className="quick-action-copy">
        <strong>{title}</strong>
        <span>{description}</span>
      </span>
      <Icon name="arrowRight" className="quick-action-arrow" />
    </Link>
  );
}
