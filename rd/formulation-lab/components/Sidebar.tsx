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

type SidebarProps = Record<string, never>;

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
      <aside className="fixed start-4 top-4 z-30 hidden h-fit max-h-[calc(100vh-2rem)] w-14 flex-col items-center overflow-y-auto overflow-x-hidden border border-slate-300 bg-white py-4 transition-colors [-ms-overflow-style:'none'] [scrollbar-width:'none'] md:flex dark:border-slate-800 dark:bg-slate-950 [&::-webkit-scrollbar]:hidden">
        <div className="mb-5 flex h-9 w-9 flex-shrink-0 items-center justify-center bg-slate-950 text-white dark:bg-sky-600">
          <FlaskConical size={20} strokeWidth={2.5} />
        </div>

        <nav className="flex w-full flex-1 flex-col items-center gap-y-2">
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

        <div className="mt-auto flex w-full flex-col items-center gap-y-2 border-slate-200 border-t pt-3 dark:border-slate-800">
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

      <nav className="safe-area-bottom fixed start-0 end-0 bottom-0 z-50 flex h-18 items-center justify-around border-slate-300 border-t bg-white px-4 pb-2 md:hidden dark:border-slate-800 dark:bg-slate-950">
        {navItems.slice(0, 5).map((item) => {
          const active = isActivePath(item.path);
          return (
            <Link
              className={`flex flex-col items-center gap-1 border border-transparent p-2 transition-colors ${
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
          className={`flex flex-col items-center gap-1 border border-transparent p-2 transition-colors ${
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
