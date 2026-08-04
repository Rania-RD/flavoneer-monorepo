import type React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import WorkspaceSectionSwitcher, {
  type WorkspaceSection,
} from "./WorkspaceSectionSwitcher";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<WorkspaceSection>(() => {
    if (typeof window === "undefined") {
      return "research";
    }
    return window.localStorage.getItem("flavoneer.workspace-section") ===
      "quality"
      ? "quality"
      : "research";
  });
  const isFullScreenWorkspace =
    /^\/project\/[^/]+\/?$/.test(location.pathname) ||
    /^\/run\/[^/]+\/?$/.test(location.pathname);

  useEffect(() => {
    document.body.classList.add("flavoneer-dashboard-active");
    document.body.classList.toggle(
      "flavoneer-workspace-active",
      isFullScreenWorkspace
    );
    return () => {
      document.body.classList.remove("flavoneer-dashboard-active");
      document.body.classList.remove("flavoneer-workspace-active");
    };
  }, [isFullScreenWorkspace]);

  const handleSectionChange = (section: WorkspaceSection) => {
    if (section === activeSection) {
      return;
    }
    setActiveSection(section);
    window.localStorage.setItem("flavoneer.workspace-section", section);
    navigate(section === "quality" ? "/reports" : "/");
  };

  const workspaceLabel =
    activeSection === "quality"
      ? t("quality_control_workspace")
      : t("workspace_label");
  const workspaceStatus =
    activeSection === "quality"
      ? t("quality_workspace_status")
      : t("brand_workspace_status");

  return (
    <div
      className={`flavoneer-dashboard relative isolate min-w-0 bg-[#eef8eb] font-sans text-[#143d32] transition-colors duration-300 dark:bg-[#0d2b24] dark:text-[#f5f4e8] ${
        isFullScreenWorkspace
          ? "h-dvh min-h-0 overflow-hidden"
          : "min-h-dvh"
      }`}
      data-layout={isFullScreenWorkspace ? "workspace" : "dashboard"}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <div className="absolute -start-24 -top-24 h-80 w-80 rounded-full bg-[#d2f2d4]/80 blur-3xl dark:bg-[#285b4d]/30" />
        <div className="absolute -end-24 top-1/3 h-96 w-96 rounded-full bg-[#f5a623]/10 blur-3xl dark:bg-[#f5a623]/8" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(28,74,60,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(28,74,60,0.035)_1px,transparent_1px)] bg-[size:32px_32px] dark:bg-[linear-gradient(rgba(210,242,212,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(210,242,212,0.025)_1px,transparent_1px)]" />
      </div>

      {!isFullScreenWorkspace && (
        <Sidebar
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
        />
      )}

      <main
        className={`relative z-10 min-w-0 flex-1 transition-all duration-300 ${
          isFullScreenWorkspace
            ? "h-dvh min-h-0 overflow-hidden"
            : "min-h-dvh p-4 pb-28 md:ms-28 md:p-6 md:pb-8 lg:ms-32"
        }`}
      >
        <div
          className={
            isFullScreenWorkspace
              ? "h-full min-h-0 w-full"
              : "mx-auto min-w-0 max-w-[1600px]"
          }
        >
          {!isFullScreenWorkspace && (
            <header className="mb-6 flex items-center justify-between gap-4 rounded-[2rem] border border-[#1c4a3c]/10 bg-[#fffdf4]/85 px-5 py-4 shadow-[0_18px_55px_rgba(28,74,60,0.08)] backdrop-blur-xl dark:border-[#d2f2d4]/10 dark:bg-[#143d32]/85 dark:shadow-black/10">
            <div className="flex min-w-0 items-center gap-3">
              <WorkspaceSectionSwitcher
                activeSection={activeSection}
                onSectionChange={handleSectionChange}
                placement="header"
              />
              <div className="hidden h-11 w-11 shrink-0 place-items-center rounded-[1rem] bg-[#f5a623] font-display font-black text-[#173e33] text-xl shadow-[inset_0_-3px_0_rgba(182,97,8,0.24)] md:grid">
                {t("app_name").slice(0, 1)}
              </div>
              <div className="min-w-0">
                <p className="truncate font-display font-black text-[#173e33] text-xl leading-none dark:text-[#f7f4df]">
                  {t("app_name")}
                </p>
                <p className="mt-1 truncate font-bold text-[#527568] text-[10px] uppercase tracking-[0.18em] dark:text-[#a9cbbb]">
                  {workspaceLabel}
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-2 rounded-full border border-[#1c4a3c]/10 bg-[#d2f2d4]/55 px-4 py-2 font-bold text-[#285b4d] text-xs sm:flex dark:border-[#d2f2d4]/10 dark:bg-[#d2f2d4]/8 dark:text-[#c8e4d4]">
              <span className="h-2 w-2 rounded-full bg-[#ff7738] shadow-[0_0_0_4px_rgba(255,119,56,0.14)]" />
              {workspaceStatus}
            </div>
            </header>
          )}

          <div
            className={`dashboard-route-surface min-w-0 ${
              isFullScreenWorkspace ? "h-full min-h-0 overflow-hidden" : ""
            }`}
            key={location.pathname}
          >
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
