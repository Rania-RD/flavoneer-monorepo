import {
  Boxes,
  FileText,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  PlayCircle,
  Settings,
  UsersRound,
} from "lucide-react";
import type React from "react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";
import SidebarItem from "./SidebarItem";

type SidebarProps = {};

const Sidebar: React.FC<SidebarProps> = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const currentPath = location.pathname;
  const { signOut } = useSettings();

  const isActivePath = (path: string) =>
    currentPath === path || (path !== "/" && currentPath.startsWith(path));

  const navItems = useMemo<{ name: string; icon: LucideIcon; path: string }[]>(
    () => [
      { name: t("dashboard"), icon: LayoutDashboard, path: "/" },
      { name: t("runs"), icon: PlayCircle, path: "/runs" },
      { name: t("materials"), icon: Boxes, path: "/materials" },
      { name: t("reports"), icon: FileText, path: "/reports" },
      { name: t("team"), icon: UsersRound, path: "/team" },
    ],
    [t]
  );

  return (
    <>
      {/* --- DESKTOP SIDEBAR (Hidden on Mobile) --- */}
      <aside className="fixed start-6 top-6 z-30 hidden h-fit max-h-[calc(100vh-3rem)] w-16 flex-col items-center overflow-y-auto overflow-x-hidden rounded-[2.5rem] border border-gray-100/50 bg-white py-6 shadow-sm transition-all duration-300 [-ms-overflow-style:'none'] [scrollbar-width:'none'] md:flex dark:border-slate-700 dark:bg-[#1e293b] [&::-webkit-scrollbar]:hidden">
        {/* Logo (Static) */}
        <div className="mb-6 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gray-900 text-white shadow-gray-900/20 shadow-lg dark:bg-indigo-500 dark:shadow-indigo-500/20">
          <FlaskConical size={20} strokeWidth={2.5} />
        </div>

        {/* Navigation (Scrollable) */}
        <nav className="flex w-full flex-1 flex-col items-center gap-y-4">
          {navItems.map((item) => (
            <SidebarItem
              active={isActivePath(item.path)}
              icon={item.icon}
              key={item.path}
              label={item.name}
              to={item.path}
            />
          ))}
        </nav>

        {/* Footer (Static) */}
        <div className="mt-auto flex w-full flex-col items-center gap-y-4 pt-4">
          <SidebarItem
            active={isActivePath("/settings")}
            icon={Settings}
            label={t("settings")}
            to="/settings"
          />
          <SidebarItem
            className="text-red-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
            icon={LogOut}
            label={t("logout")}
            onClick={signOut}
          />
        </div>
      </aside>

      {/* --- MOBILE BOTTOM NAVIGATION (Hidden on Desktop) --- */}
      <nav className="safe-area-bottom fixed start-0 end-0 bottom-0 z-50 flex h-20 items-center justify-around border-gray-100 border-t bg-white px-4 pb-2 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] md:hidden dark:border-slate-700 dark:bg-[#1e293b]">
        {navItems.slice(0, 5).map((item) => {
          const active = isActivePath(item.path);
          return (
            <Link
              className={`flex flex-col items-center gap-1 rounded-xl p-2 transition-colors ${
                active
                  ? "text-gray-900 dark:text-indigo-400"
                  : "text-gray-400 dark:text-slate-500"
              }`}
              key={item.path}
              to={item.path}
            >
              <item.icon size={24} strokeWidth={active ? 2.5 : 2} />
              <span className="font-medium text-[10px]">{item.name}</span>
            </Link>
          );
        })}
        <Link
          className={`flex flex-col items-center gap-1 rounded-xl p-2 transition-colors ${
            isActivePath("/settings")
              ? "text-gray-900 dark:text-indigo-400"
              : "text-gray-400 dark:text-slate-500"
          }`}
          to="/settings"
        >
          <Settings
            size={24}
            strokeWidth={isActivePath("/settings") ? 2.5 : 2}
          />
          <span className="font-medium text-[10px]">{t("settings")}</span>
        </Link>
      </nav>
    </>
  );
};

export default Sidebar;
