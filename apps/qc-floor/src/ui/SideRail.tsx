import { BarChart3, ClipboardCheck, Factory, FlaskConical, Settings } from "lucide-react";
import { useI18n } from "../lib/i18n";

export function SideRail() {
  const { t } = useI18n();
  const items = [
    { active: true, icon: Factory, label: t("overview") },
    { icon: ClipboardCheck, label: t("records") },
    { icon: BarChart3, label: t("reports") },
  ];

  return (
    <aside className="side-rail" aria-label={t("qualityControl")}>
      <div className="side-rail__brand" aria-label={t("appName")} role="img">
        <FlaskConical aria-hidden="true" size={24} />
      </div>
      <nav className="side-rail__nav">
        {items.map((item) => (
          <button
            aria-current={item.active ? "page" : undefined}
            aria-label={item.label}
            className="rail-button"
            data-active={item.active || undefined}
            key={item.label}
            type="button"
          >
            <item.icon aria-hidden="true" size={21} strokeWidth={2.2} />
            <span className="rail-tooltip">{item.label}</span>
          </button>
        ))}
      </nav>
      <button aria-label={t("settings")} className="rail-button" type="button">
        <Settings aria-hidden="true" size={21} />
        <span className="rail-tooltip">{t("settings")}</span>
      </button>
    </aside>
  );
}
