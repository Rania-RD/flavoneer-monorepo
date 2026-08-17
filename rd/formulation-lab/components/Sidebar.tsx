import { api } from "@flavoneer/backend/api";
import { useQuery } from "convex/react";
import {
  BarChart3,
  Boxes,
  Factory,
  FileText,
  FlaskConical,
  LayoutDashboard,
  type LucideIcon,
  PlayCircle,
  ShieldCheck,
} from "lucide-react";
import type React from "react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { usePermissions } from "../hooks/usePermissions";
import SidebarItem from "./SidebarItem";
import SidebarProfileMenu from "./SidebarProfileMenu";
import WorkspaceSectionSwitcher, {
  type WorkspaceSection,
} from "./WorkspaceSectionSwitcher";

interface SidebarProps {
  activeSection: WorkspaceSection;
  onSectionChange: (section: WorkspaceSection) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSectionChange,
}) => {
  const { t } = useTranslation();
  const superAdminAccess = useQuery(api.superAdmin.getAccess);
  const { hasPermission } = usePermissions();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActivePath = (path: string) => {
    if (path === "/") {
      return currentPath === "/" || currentPath.startsWith("/project/");
    }
    if (path === "/runs") {
      return currentPath.startsWith("/runs") || currentPath.startsWith("/run/");
    }
    return currentPath === path || currentPath.startsWith(path);
  };

  const navItems = useMemo<
    {
      mobileName?: string;
      name: string;
      icon: LucideIcon;
      mirrorInRTL?: boolean;
      path: string;
    }[]
  >(() => {
    const workspaceItems =
      activeSection === "quality"
        ? [
            {
              mobileName: t("monitor"),
              name: t("production_monitoring"),
              icon: Factory,
              path: "/quality/production-line-records",
            },
            {
              mobileName: t("samples"),
              name: t("lab_sample_submission"),
              icon: FlaskConical,
              path: "/quality/lab-samples",
            },
            ...(hasPermission("review_production_checks")
              ? [
                  {
                    mobileName: t("qc_reports_mobile"),
                    name: t("qc_reports_title"),
                    icon: BarChart3,
                    mirrorInRTL: true,
                    path: "/quality/reports",
                  },
                ]
              : []),
            {
              mobileName: t("review"),
              name: t("run_review"),
              icon: PlayCircle,
              mirrorInRTL: true,
              path: "/runs",
            },
            { name: t("materials"), icon: Boxes, path: "/materials" },
          ]
        : [
            { name: t("dashboard"), icon: LayoutDashboard, path: "/" },
            {
              name: t("runs"),
              icon: PlayCircle,
              mirrorInRTL: true,
              path: "/runs",
            },
            { name: t("materials"), icon: Boxes, path: "/materials" },
            { name: t("reports"), icon: FileText, path: "/reports" },
          ];
    if (superAdminAccess?.isSuperAdmin) {
      workspaceItems.push({
        mobileName: t("super_admin_mobile"),
        name: t("super_admin_badge"),
        icon: ShieldCheck,
        path: "/super-admin",
      });
    }
    return workspaceItems;
  }, [activeSection, hasPermission, superAdminAccess?.isSuperAdmin, t]);

  return (
    <>
      {/* --- DESKTOP SIDEBAR (Hidden on Mobile) --- */}
      <aside className="fixed start-5 top-5 bottom-5 z-30 hidden w-[4.5rem] flex-col items-center overflow-visible rounded-[2.25rem] border border-[#d2f2d4]/15 bg-[#143d32] py-5 shadow-[0_24px_60px_rgba(16,47,39,0.24)] transition-all duration-300 md:flex dark:border-[#d2f2d4]/10 dark:bg-[#102f27]">
        {/* Workspace section selector */}
        <div className="mb-6">
          <WorkspaceSectionSwitcher
            activeSection={activeSection}
            onSectionChange={onSectionChange}
            placement="rail"
          />
        </div>

        {/* Navigation (Scrollable) */}
        <nav
          className="flex min-h-0 w-full flex-1 flex-col items-center gap-y-4 overflow-y-auto overflow-x-hidden py-1 [-ms-overflow-style:'none'] [scrollbar-width:'none'] [&::-webkit-scrollbar]:hidden"
          data-testid="desktop-workspace-navigation"
        >
          {navItems.map((item) => (
            <SidebarItem
              active={isActivePath(item.path)}
              icon={item.icon}
              key={item.path}
              label={item.name}
              mirrorInRTL={item.mirrorInRTL}
              to={item.path}
            />
          ))}
        </nav>

        {/* Footer (Static) */}
        <div className="mt-auto flex w-full flex-col items-center pt-4">
          <SidebarProfileMenu placement="desktop" />
        </div>
      </aside>

      {/* --- MOBILE BOTTOM NAVIGATION (Hidden on Desktop) --- */}
      <nav className="safe-area-bottom fixed start-3 end-3 bottom-3 z-50 flex h-[4.75rem] items-center justify-around rounded-[1.75rem] border border-[#1c4a3c]/10 bg-[#fffdf4]/95 px-3 pb-1 shadow-[0_16px_50px_rgba(16,47,39,0.22)] backdrop-blur-xl md:hidden dark:border-[#d2f2d4]/10 dark:bg-[#143d32]/95">
        {navItems.slice(0, 5).map((item) => {
          const active = isActivePath(item.path);
          return (
            <Link
              className={`flex flex-col items-center gap-1 rounded-xl p-2 transition-colors ${
                active
                  ? "bg-[#d2f2d4] text-[#173e33] dark:bg-[#f5a623] dark:text-[#173e33]"
                  : "text-[#6f8e82] hover:bg-[#d2f2d4]/45 hover:text-[#1c4a3c] dark:text-[#9abcae] dark:hover:bg-[#d2f2d4]/10 dark:hover:text-[#f7f4df]"
              }`}
              key={item.path}
              to={item.path}
            >
              <item.icon
                className={item.mirrorInRTL ? "rtl:-scale-x-100" : undefined}
                size={24}
                strokeWidth={active ? 2.5 : 2}
              />
              <span className="font-medium text-[10px]">
                {item.mobileName ?? item.name}
              </span>
            </Link>
          );
        })}
        <SidebarProfileMenu placement="mobile" />
      </nav>
    </>
  );
};

export default Sidebar;
