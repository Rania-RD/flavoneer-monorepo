import type React from "react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import type { WorkspaceSection } from "./WorkspaceSectionSwitcher";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
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

  useEffect(() => {
    if (
      location.pathname.startsWith("/quality/") &&
      activeSection !== "quality"
    ) {
      setActiveSection("quality");
      window.localStorage.setItem("flavoneer.workspace-section", "quality");
    }
  }, [activeSection, location.pathname]);

  const handleSectionChange = (section: WorkspaceSection) => {
    if (section === activeSection) {
      return;
    }
    setActiveSection(section);
    window.localStorage.setItem("flavoneer.workspace-section", section);
    navigate(section === "quality" ? "/reports" : "/");
  };

  return (
    <div
      className={`flavoneer-dashboard relative isolate min-w-0 bg-[#eef8eb] font-sans text-[#143d32] transition-colors duration-300 dark:bg-[#0d2b24] dark:text-[#f5f4e8] ${
        isFullScreenWorkspace ? "h-dvh min-h-0 overflow-hidden" : "min-h-dvh"
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
