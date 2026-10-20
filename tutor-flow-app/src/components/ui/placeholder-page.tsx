import type { IconName } from "@/src/components/ui/icon";
import { Icon } from "@/src/components/ui/icon";
import { PageHeader } from "@/src/components/ui/page-header";
import { getTranslations } from "@/src/i18n";

type PlaceholderPageProps = {
  page: "schedule" | "students" | "learning" | "registration" | "payments" | "settings";
  icon: IconName;
};

export function PlaceholderPage({ page, icon }: PlaceholderPageProps) {
  const t = getTranslations();

  return (
    <div className="page-container">
      <PageHeader title={t[page]} description={t.pageDescriptions[page]} />
      <section className="placeholder-card" aria-labelledby="placeholder-title">
        <div className={`placeholder-illustration tone-${page}`}>
          <span className="placeholder-icon-circle">
            <Icon name={icon} />
          </span>
          <span className="placeholder-orbit orbit-one" />
          <span className="placeholder-orbit orbit-two" />
        </div>
        <p className="placeholder-kicker">{t.comingSoon}</p>
        <h2 id="placeholder-title">{t.placeholderTitles[page]}</h2>
        <p className="placeholder-description">{t.placeholderMessages[page]}</p>
      </section>
    </div>
  );
}
