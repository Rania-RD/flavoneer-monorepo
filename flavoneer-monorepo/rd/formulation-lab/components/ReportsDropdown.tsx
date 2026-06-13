import {
  Archive,
  CheckCircle,
  Clock,
  Download,
  Eye,
  MoreHorizontal,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSettings } from "../context/SettingsContext";
import type { EnrichedLabReport } from "../types";

interface ReportsDropdownProps {
  onAction?: (action: string, report: EnrichedLabReport) => void;
  report: EnrichedLabReport;
}

const ReportsDropdown: React.FC<ReportsDropdownProps> = ({
  report,
  onAction,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { isRTL } = useSettings();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleAction = (action: string) => {
    setIsOpen(false);
    if (onAction) {
      onAction(action, report);
    }
  };

  return (
    <div className="relative z-50" ref={menuRef}>
      <button
        className={`rounded-full p-2 transition-colors ${
          isOpen
            ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
            : "text-gray-400 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-white"
        }`}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      >
        <MoreHorizontal size={20} />
      </button>

      {isOpen && (
        <div
          className={`absolute top-full z-[100] mt-2 w-60 rounded-2xl border border-gray-100 bg-white/90 p-2 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] backdrop-blur-xl dark:border-slate-700 dark:bg-[#1e293b]/95 dark:shadow-black/50 ${isRTL ? "start-0 origin-top-start" : "end-0 origin-top-end"} fade-in zoom-in-95 animate-in duration-200`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col gap-1">
            <button
              className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-start font-medium text-gray-700 text-sm transition-colors hover:bg-blue-50 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-blue-900/20 dark:hover:text-blue-300"
              onClick={() => handleAction("view")}
            >
              <div className="rounded-lg bg-blue-50 p-1.5 text-blue-500 transition-colors group-hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:group-hover:bg-blue-500/20">
                <Eye size={16} />
              </div>
              <span>{t("view_full_report")}</span>
            </button>

            <button
              className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-start font-medium text-gray-700 text-sm transition-colors hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={() => handleAction("export")}
            >
              <div className="rounded-lg bg-gray-100 p-1.5 text-gray-500 transition-colors group-hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-slate-700">
                <Download size={16} />
              </div>
              <span>{t("export_pdf")}</span>
            </button>

            <div className="mx-2 my-1 h-px bg-gray-100 dark:bg-slate-700/50" />

            <button
              className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-start font-medium text-gray-700 text-sm transition-colors hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={() => handleAction("toggle_status")}
            >
              {report.status === "Approved" ? (
                <>
                  <div className="rounded-lg bg-orange-50 p-1.5 text-orange-500 transition-colors group-hover:bg-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:group-hover:bg-orange-500/20">
                    <Clock size={16} />
                  </div>
                  <span>{t("mark_pending")}</span>
                </>
              ) : (
                <>
                  <div className="rounded-lg bg-green-50 p-1.5 text-green-500 transition-colors group-hover:bg-green-100 dark:bg-green-500/10 dark:text-green-400 dark:group-hover:bg-green-500/20">
                    <CheckCircle size={16} />
                  </div>
                  <span>{t("approve_report")}</span>
                </>
              )}
            </button>

            <button
              className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-start font-medium text-red-600 text-sm transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              onClick={() => handleAction("archive")}
            >
              <div className="rounded-lg bg-red-50 p-1.5 text-red-500 transition-colors group-hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:group-hover:bg-red-500/20">
                <Archive size={16} />
              </div>
              <span>{t("archive")}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsDropdown;
