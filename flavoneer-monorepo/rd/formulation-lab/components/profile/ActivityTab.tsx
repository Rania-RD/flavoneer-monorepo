import { useQuery } from "convex/react";
import { Clock, FileText, LayoutDashboard, Package } from "lucide-react";
import { DateTime } from "luxon";
import type React from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

type ActivityListItem = FunctionReturnType<
  typeof api.activities.listForUser
>[number];

const PAGE_ICONS: Record<string, React.ReactNode> = {
  Dashboard: <LayoutDashboard size={14} />,
  Formulation: <FileText size={14} />,
  Inventory: <Package size={14} />,
};

const PAGE_COLORS: Record<string, string> = {
  Dashboard: "#3B82F6",
  Formulation: "#8B5CF6",
  Inventory: "#10B981",
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) {
    return "Just now";
  }
  if (mins < 60) {
    return `${mins}m ago`;
  }
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) {
    return `${hrs}h ago`;
  }
  const days = Math.floor(hrs / 24);
  if (days < 7) {
    return `${days}d ago`;
  }
  return DateTime.fromMillis(ts).toLocaleString(DateTime.DATE_SHORT);
}

const ActivityTab: React.FC = () => {
  const { t } = useTranslation();
  const activities = useQuery(api.activities.listForUser) ?? [];

  return (
    <div className="fade-in slide-in-from-end-4 animate-in space-y-6 duration-300">
      <div>
        <h3 className="mb-1 font-bold text-gray-900 text-lg dark:text-white">
          {t("recent_activity")}
        </h3>
        <p className="text-gray-500 text-sm dark:text-slate-400">
          {t("your_latest_actions_across_the_platform")}
        </p>
      </div>

      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-slate-500">
          <Clock className="mb-3 opacity-40" size={40} />
          <p className="font-medium text-sm">{t("no_activity_yet")}</p>
          <p className="mt-1 text-xs">
            {t("actions_you_perform_will_appear_here")}
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute start-[17px] top-0 bottom-0 w-px bg-gray-200 dark:bg-slate-700" />

          <div className="space-y-0">
            {activities.map((act: ActivityListItem, idx: number) => {
              const color = PAGE_COLORS[act.page] ?? "#6B7280";
              const icon = PAGE_ICONS[act.page] ?? <Clock size={14} />;
              return (
                <div
                  className="group relative flex items-start gap-4 py-3"
                  key={act._id ?? idx}
                >
                  {/* Dot */}
                  <div
                    className="relative z-10 flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: color }}
                  >
                    {icon}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 text-sm leading-tight dark:text-white">
                      {act.action}
                    </p>
                    <p className="mt-0.5 truncate text-gray-500 text-xs dark:text-slate-400">
                      {act.target}
                    </p>
                  </div>

                  {/* Timestamp */}
                  <span className="mt-0.5 shrink-0 whitespace-nowrap text-[11px] text-gray-400 dark:text-slate-500">
                    {timeAgo(act.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityTab;
