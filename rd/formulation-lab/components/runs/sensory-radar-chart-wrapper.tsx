import { useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import type React from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { SensoryRadarChart } from "../SensoryRadarChart";

interface SensoryRadarChartWrapperProps {
  runId: Id<"runs">;
}

const SensoryRadarChartWrapper: React.FC<SensoryRadarChartWrapperProps> = ({
  runId,
}) => {
  const { t } = useTranslation();
  const form = useQuery(api.sensory.getFormByRun, { runId });

  if (form === undefined) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl bg-gray-50 dark:bg-slate-800/50">
        <Loader2 className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (form === null) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-gray-200 border-dashed bg-gray-50 text-gray-400 dark:border-slate-800 dark:bg-slate-900/50">
        <p>{t("no_sensory_form_generated_yet")}</p>
      </div>
    );
  }

  return <SensoryRadarChart formId={form._id} />;
};

export default SensoryRadarChartWrapper;
