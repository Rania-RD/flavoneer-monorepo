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

  const isActivePath = (path: string) => {
    if (path === "/") {
      return currentPath === "/" || currentPath.startsWith("/project/");
    }
    if (path === "/runs") {
      return currentPath.startsWith("/runs") || currentPath.startsWith("/run/");
    }
    return currentPath === path || currentPath.startsWith(path);
  };

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
      <aside className="fixed start-5 top-5 z-30 hidden h-fit max-h-[calc(100vh-2.5rem)] w-[4.5rem] flex-col items-center overflow-y-auto overflow-x-hidden rounded-[2.25rem] border border-[#d2f2d4]/15 bg-[#143d32] py-5 shadow-[0_24px_60px_rgba(16,47,39,0.24)] transition-all duration-300 [-ms-overflow-style:'none'] [scrollbar-width:'none'] md:flex dark:border-[#d2f2d4]/10 dark:bg-[#102f27] [&::-webkit-scrollbar]:hidden">
        {/* Logo (Static) */}
        <div className="mb-6 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[1rem] bg-[#f5a623] text-[#173e33] shadow-[inset_0_-3px_0_rgba(182,97,8,0.28),0_10px_24px_rgba(0,0,0,0.18)]">
          <FlaskConical size={21} strokeWidth={2.6} />
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
            className="text-[#f0a99b] hover:bg-[#ff7738]/15 hover:text-[#ffc5b2]"
            icon={LogOut}
            label={t("logout")}
            onClick={signOut}
          />
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
              <item.icon size={24} strokeWidth={active ? 2.5 : 2} />
              <span className="font-medium text-[10px]">{item.name}</span>
            </Link>
          );
        })}
        <Link
          className={`flex flex-col items-center gap-1 rounded-xl p-2 transition-colors ${
            isActivePath("/settings")
              ? "bg-[#d2f2d4] text-[#173e33] dark:bg-[#f5a623] dark:text-[#173e33]"
              : "text-[#6f8e82] hover:bg-[#d2f2d4]/45 hover:text-[#1c4a3c] dark:text-[#9abcae] dark:hover:bg-[#d2f2d4]/10 dark:hover:text-[#f7f4df]"
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
