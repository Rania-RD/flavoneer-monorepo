import { pdf } from "@react-pdf/renderer";
import { useQuery } from "convex/react";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Download,
  FileText,
  FlaskConical,
  TestTube,
  User,
  XCircle,
} from "lucide-react";
import type React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { ReportPDF } from "../components/ReportPDF";
import { useSettings } from "../context/SettingsContext";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { useToast } from "../hooks/useToast";
import { MotionDiv, modalVariants } from "../lib/animations";

const ReportDetails: React.FC = () => {
  const { t } = useTranslation();
  const { language } = useSettings();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const report = useQuery(
    api.labReports.get,
    id ? { id: id as Id<"labReports">, language } : "skip"
  );

  if (report === undefined) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-gray-500 dark:text-slate-400">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="animate-pulse font-medium">
            {t("loading_report_data")}
          </p>
        </div>
      </div>
    );
  }

  if (report === null) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-gray-500 dark:text-slate-400">
          <FileText className="text-gray-300 dark:text-slate-600" size={48} />
          <p className="font-bold text-xl">{t("report_not_found")}</p>
          <button
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white transition hover:bg-indigo-700"
            onClick={() => navigate("/reports")}
            type="button"
          >
            {t("back_to_reports")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <MotionDiv
      animate="visible"
      className="mx-auto max-w-5xl space-y-8 pb-12"
      exit="exit"
      initial="hidden"
      variants={modalVariants}
    >
      {/* Header and Back Button */}
      <div className="flex items-center justify-between border-b pb-6 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
            onClick={() => navigate(-1)}
            type="button"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-bold text-3xl text-gray-900 tracking-tight dark:text-white">
                {report.projectName || t("unnamed_formulation")}
              </h1>
              <span
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-bold text-sm ${
                  report.status === "Approved"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : ""
                }${
                  report.status === "Failed"
                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    : ""
                }${
                  report.status !== "Approved" && report.status !== "Failed"
                    ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                    : ""
                }`}
              >
                {report.status === "Approved" && <CheckCircle size={14} />}
                {report.status === "Failed" && <XCircle size={14} />}
                {report.status}
              </span>
            </div>
            <p className="mt-1 flex items-center gap-2 font-medium text-gray-500 text-sm dark:text-slate-400">
              <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-gray-700 dark:bg-slate-800 dark:text-slate-300">
                {t("lot")} {report.lotNumber}
              </span>
              <span>•</span>
              <span>v{report.version}</span>
            </p>
          </div>
        </div>
        <button
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 font-medium text-gray-700 text-sm shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          onClick={async () => {
            try {
              toast.info(t("generating_pdf_summary"));
              const blob = await pdf(<ReportPDF report={report} />).toBlob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.style.display = "none";
              a.href = url;
              a.download = `${report.projectName || t("report")}_${report.lotNumber}.pdf`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              toast.success(t("pdf_generated_successfully"));
            } catch (error) {
              toast.error(t("failed_to_generate_pdf"));
              console.error(error);
            }
          }}
          type="button"
        >
          <Download size={16} />

          {t("export_pdf")}
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#1e293b]">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
            <Calendar size={24} />
          </div>
          <div>
            <p className="font-medium text-gray-500 text-sm dark:text-slate-400">
              {t("date_generated")}
            </p>
            <p className="font-bold text-gray-900 text-lg dark:text-white">
              {report.date}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#1e293b]">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">
            <User size={24} />
          </div>
          <div>
            <p className="font-medium text-gray-500 text-sm dark:text-slate-400">
              {t("lead_chemist")}
            </p>
            <p className="font-bold text-gray-900 text-lg dark:text-white">
              {report.leadChemist}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#1e293b]">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400">
            <FlaskConical size={24} />
          </div>
          <div>
            <p className="font-medium text-gray-500 text-sm dark:text-slate-400">
              {t("sample_type")}
            </p>
            <p className="font-bold text-gray-900 text-lg capitalize dark:text-white">
              {report.sampleType}
            </p>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1e293b]">
        <div className="flex items-center gap-3 border-gray-100 border-b bg-gray-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/50">
          <div className="rounded-lg bg-indigo-100 p-2 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
            <TestTube size={20} />
          </div>
          <h2 className="font-bold text-gray-900 text-lg dark:text-white">
            {t("detailed_analytical_results")}
          </h2>
        </div>

        {report.results.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-slate-400">
            {t("no_test_results_recorded_for_this_report")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="border-gray-100 border-b bg-white text-gray-500 dark:border-slate-800 dark:bg-[#1e293b] dark:text-slate-400">
                <tr>
                  <th className="px-6 py-4 font-semibold">{t("parameter")}</th>
                  <th className="whitespace-nowrap px-6 py-4 font-semibold">
                    {t("method")}
                  </th>
                  <th className="whitespace-nowrap px-6 py-4 text-center font-semibold">
                    {t("target_range")}
                  </th>
                  <th className="whitespace-nowrap px-6 py-4 text-center font-semibold">
                    {t("result_value")}
                  </th>
                  <th className="px-6 py-4 text-end font-semibold">
                    {t("evaluation")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800/50">
                {report.results.map((res) => {
                  const isPass =
                    res.actualValue >= res.min && res.actualValue <= res.max;
                  return (
                    <tr
                      className="transition-colors hover:bg-gray-50/50 dark:hover:bg-slate-800/30"
                      key={res.parameter}
                    >
                      <td className="whitespace-nowrap px-6 py-4 font-bold text-gray-900 dark:text-white">
                        {res.parameter}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-500 dark:text-slate-400">
                        {res.method}
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-gray-600 dark:text-slate-300">
                        {res.targetRange}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-bold text-base text-gray-900 dark:text-white">
                          {res.actualValue}
                        </span>
                        <span className="ms-1 font-medium text-gray-400 text-xs dark:text-slate-500">
                          {res.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-end">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-bold text-xs ${
                            isPass
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {isPass ? (
                            <CheckCircle size={12} />
                          ) : (
                            <XCircle size={12} />
                          )}
                          {isPass ? t("pass_upper") : t("fail_upper")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Official Sign-Off Stamp */}
      {report.status === "Approved" && report.signoffData && (
        <div className="flex justify-end pe-8 pt-8">
          <div className="flex min-w-[250px] flex-col items-center border-indigo-200 border-t-2 pt-4 dark:border-indigo-900/50">
            <span className="mb-2 font-bold text-[10px] text-indigo-500 uppercase tracking-widest">
              {t("electronically_signed_by")}
            </span>
            <span
              className="px-4 py-2 text-4xl text-indigo-900 dark:text-indigo-100"
              style={{ fontFamily: report.signoffFont || "inherit" }}
            >
              {report.signoffData}
            </span>
          </div>
        </div>
      )}
    </MotionDiv>
  );
};

export default ReportDetails;
