import { api } from "@flavoneer/backend/api";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Clock, FileText, LayoutDashboard, Package } from "lucide-react";
import { DateTime } from "luxon";
import type React from "react";
import { useTranslation } from "react-i18next";

type ActivityListItem = FunctionReturnType<
  typeof api.activities.listForUser
>[number];

const PAGE_ICONS: Record<string, React.ReactNode> = {
  Dashboard: <LayoutDashboard size={14} />,
  Formulation: <FileText size={14} />,
  Inventory: <Package size={14} />,
};

const PAGE_COLORS: Record<string, string> = {
  Dashboard: "#F5A623",
  Formulation: "#FF7738",
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

const UserActivityLog: React.FC = () => {
  const { t } = useTranslation();
  const activities = useQuery(api.activities.listForUser) ?? [];

  return (
    <section aria-labelledby="user-activity-heading">
      <div>
        <h3
          className="mb-1 font-bold text-gray-900 text-lg dark:text-white"
          id="user-activity-heading"
        >
          {t("recent_activity")}
        </h3>
        <p className="text-gray-500 text-sm dark:text-slate-400">
          {t("your_latest_actions_across_the_platform")}
        </p>
      </div>

      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-slate-500">
          <Clock className="mb-3 opacity-40" size={40} />
          <p className="font-medium text-sm">{t("no_activity_yet")}</p>
          <p className="mt-1 text-xs">
            {t("actions_you_perform_will_appear_here")}
          </p>
        </div>
      ) : (
        <div className="relative mt-5">
          <div className="absolute start-[17px] top-0 bottom-0 w-px bg-gray-200 dark:bg-slate-700" />

          <div className="space-y-0">
            {activities.map((activity: ActivityListItem, index: number) => {
              const color = PAGE_COLORS[activity.page] ?? "#6B7280";
              const icon = PAGE_ICONS[activity.page] ?? <Clock size={14} />;

              return (
                <div
                  className="group relative flex items-start gap-4 py-3"
                  key={activity._id ?? index}
                >
                  <div
                    className="relative z-10 flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: color }}
                  >
                    {icon}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 text-sm leading-tight dark:text-white">
                      {activity.action}
                    </p>
                    <p className="mt-0.5 truncate text-gray-500 text-xs dark:text-slate-400">
                      {activity.target}
                    </p>
                  </div>

                  <span className="mt-0.5 shrink-0 whitespace-nowrap text-[11px] text-gray-400 dark:text-slate-500">
                    {timeAgo(activity.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};

export default UserActivityLog;
