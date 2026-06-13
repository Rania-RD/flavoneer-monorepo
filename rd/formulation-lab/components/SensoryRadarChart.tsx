import { useQuery } from "convex/react";
import type React from "react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

interface SensoryRadarChartProps {
  formId: Id<"sensoryForms">;
}

export const SensoryRadarChart: React.FC<SensoryRadarChartProps> = ({
  formId,
}) => {
  const { t } = useTranslation();
  const evaluations = useQuery(api.sensory.getEvaluationsByForm, { formId });

  // Calculate averages of 1-9 Hedonic scores to plot on the Radar
  const chartData = useMemo(() => {
    if (!evaluations || evaluations.length === 0) {
      return [];
    }

    const scoresMap: Record<string, number[]> = {};

    for (const evalDoc of evaluations) {
      try {
        const answers = JSON.parse(evalDoc.resultsJSON);
        for (const [attribute, score] of Object.entries(answers)) {
          // Only plot numerical (Hedonic 1-9) ratings on the spider chart
          if (typeof score === "number") {
            if (!scoresMap[attribute]) {
              scoresMap[attribute] = [];
            }
            scoresMap[attribute].push(score);
          }
        }
      } catch (e) {
        console.error("Failed to parse evaluation JSON", e);
      }
    }

    const averages = Object.keys(scoresMap).map((attribute) => {
      const allScores = scoresMap[attribute];
      const sum = allScores.reduce((acc, curr) => acc + curr, 0);
      return {
        attribute,
        score: Number.parseFloat((sum / allScores.length).toFixed(1)),
        fullMark: 9,
      };
    });

    return averages;
  }, [evaluations]);

  if (evaluations === undefined) {
    return (
      <div className="flex h-64 animate-pulse items-center justify-center rounded-2xl bg-gray-100 dark:bg-slate-800">
        {t("loading_responses")}
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-gray-200 border-dashed bg-gray-50 text-gray-400 dark:border-slate-800 dark:bg-slate-900/50">
        <p>{t("no_numeric_evaluations_yet")}</p>
        <span className="mt-1 text-gray-400 text-xs">
          {evaluations.length} {t("total_responses")}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0f172a]">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-bold text-gray-900 text-lg dark:text-white">
          {t("sensory_profile")}
        </h3>
        <span className="rounded-full bg-indigo-50 px-3 py-1 font-bold text-indigo-700 text-xs dark:bg-indigo-900/30 dark:text-indigo-400">
          {evaluations.length} {t("testers")}
        </span>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer height="100%" width="100%">
          <RadarChart cx="50%" cy="50%" data={chartData} outerRadius="70%">
            <PolarGrid className="stroke-gray-200 dark:stroke-slate-700" />
            <PolarAngleAxis
              className="font-bold text-xs"
              dataKey="attribute"
              tick={{ fill: "#64748b" }}
            />
            <PolarRadiusAxis
              angle={30}
              className="text-xs"
              domain={[0, 9]}
              tick={{ fill: "#94a3b8" }}
              tickCount={10}
            />
            <Radar
              dataKey="score"
              fill="#818cf8"
              fillOpacity={0.5}
              name="Avg Score"
              stroke="#6366f1"
              strokeWidth={2}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "none",
                boxShadow:
                  "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
