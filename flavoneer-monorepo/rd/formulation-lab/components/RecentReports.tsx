import { useMutation, useQuery } from "convex/react";
import { FlaskConical } from "lucide-react";
import type React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";
import { api } from "../convex/_generated/api";
import { usePermissions } from "../hooks/usePermissions";
import { useToast } from "../hooks/useToast";
import type { EnrichedLabReport } from "../types";
import ReportsDropdown from "./ReportsDropdown";

const RecentReports: React.FC = () => {
  const { t } = useTranslation();
  const { profile } = useSettings();
  const { user, role } = usePermissions();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Convex Hooks
  const reportsResponse = useQuery(api.labReports.list, {
    paginationOpts: { numItems: 50, cursor: null },
  });
  const reportsRaw = reportsResponse?.page;

  const runsResponse = useQuery(api.runs.list, {
    paginationOpts: { numItems: 50, cursor: null },
  });
  const runsRaw = runsResponse?.page;
  const updateStatus = useMutation(api.labReports.updateStatus);

  // Filter reports to only those that have a valid linked run
  const validReports = (reportsRaw ?? []).filter((r) =>
    (runsRaw ?? []).some((run) => run._id === r.runId)
  );

  // Take top 3 most recent (assuming list returns them in order or we slice)
  const reports: EnrichedLabReport[] =
    reportsRaw && runsRaw ? validReports.slice(0, 3) : [];

  const handleAction = async (action: string, report: EnrichedLabReport) => {
    switch (action) {
      case "view":
        // Link to the full report page
        navigate(`/reports/${report._id}`);
        break;
      case "export":
        // Mock export functionality
        console.log(`Generating PDF summary for report: ${report._id}`);
        break;
      case "toggle_status": {
        if (
          report.leadChemist !== user?.name &&
          role?.key !== "admin" &&
          role?.key !== "supervisor"
        ) {
          toast.error(t("unauthorized_signoff"));
          return;
        }

        // Toggle status logic
        const newStatus = report.status === "Approved" ? "Pending" : "Approved";
        const isApproving = newStatus === "Approved";

        await updateStatus({
          id: report._id,
          status: newStatus,
          signoffData: isApproving ? profile?.signatureData : undefined,
          signoffFont: isApproving ? profile?.signatureFont : undefined,
          signoffType: isApproving
            ? (profile?.signatureType as "upload" | "text" | undefined)
            : undefined,
        });
        break;
      }
      case "archive":
        // Archive functionality not fully implemented in schema yet, but logic would go here
        console.log("Archive requested for", report._id);
        break;
      default:
        break;
    }
  };

  if (reportsRaw === undefined || runsRaw === undefined) {
    return (
      <div className="p-8 text-center text-gray-500">
        {t("loading_reports")}
      </div>
    );
  }

  return (
    <div className="rounded-[2.5rem] border border-black/5 bg-vivid-blue p-6 shadow-sm sm:p-8 dark:bg-rose-900/10">
      <div className="mb-6">
        <h3 className="font-bold text-charcoal dark:text-slate-100">
          {t("recentReports")}
        </h3>
      </div>
      <div className="space-y-4">
        {reports.map((report, i) => (
          <div
            className="group relative flex cursor-pointer items-center gap-4 rounded-2xl border border-white/50 bg-white/40 p-4 shadow-sm backdrop-blur-sm transition-all duration-300 hover:z-20 hover:scale-[1.02] hover:shadow-xl dark:border-slate-700 dark:bg-[#1e293b]"
            key={report._id}
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                i % 2 === 0
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
                  : "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300"
              }`}
              onClick={() => navigate(`/reports/${report._id}`)}
            >
              <FlaskConical className="stroke-[2.5]" size={20} />
            </div>

            <div
              className="min-w-0 flex-1 text-start"
              onClick={() => navigate(`/reports/${report._id}`)}
            >
              <h4 className="truncate font-bold text-charcoal text-sm transition-colors group-hover:text-action-pink dark:text-slate-100 dark:group-hover:text-blue-400">
                {report.projectName}
              </h4>
              <div className="mt-0.5 flex items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    report.status === "Approved"
                      ? "bg-green-600"
                      : report.status === "Failed"
                        ? "bg-red-600"
                        : "bg-orange-600"
                  }`}
                />
                <p className="truncate font-medium text-charcoal/70 text-xs dark:text-slate-400">
                  {report.status} • {report.results[0]?.parameter}
                </p>
              </div>
            </div>

            {/* Z-index 30 ensures menu is above other content in the card */}
            <div className="relative z-30">
              <ReportsDropdown onAction={handleAction} report={report} />
            </div>
          </div>
        ))}
        {reports.length === 0 && (
          <div className="text-center text-gray-500 text-sm dark:text-slate-400">
            {t("no_recent_reports")}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentReports;
