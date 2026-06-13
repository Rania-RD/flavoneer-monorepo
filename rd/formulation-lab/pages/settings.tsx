import { Fingerprint, GitBranch, Palette, Shield } from "lucide-react";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import RoleManagementSection from "../components/Settings/RoleManagementSection";
import TraceabilityConfig from "../components/Settings/TraceabilityConfig";
import VersionControlConfig from "../components/Settings/VersionControlConfig";
import ThemeToggle from "../components/ThemeToggle";
import { usePermissions } from "../hooks/usePermissions";

type Tab = "appearance" | "roles" | "traceability" | "versionControl";

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const { role } = usePermissions();
  const [units, setUnits] = useState("metric");

  const [activeTab, setActiveTab] = useState<Tab>("appearance");

  const tabs = [
    { id: "appearance", label: t("appearance"), icon: Palette },
    { id: "roles", label: t("roles_permissions"), icon: Shield },
    { id: "traceability", label: t("traceability_id"), icon: Fingerprint },
    { id: "versionControl", label: t("version_control"), icon: GitBranch },
  ] as const;

  const sidebarContent = React.useMemo(
    () => (
      <div className="w-full md:w-1/4">
        <nav className="flex flex-col space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-start transition-all duration-200 ${
                  isActive
                    ? "border-indigo-600 border-s-4 bg-indigo-50 text-indigo-700 shadow-sm dark:border-indigo-500 dark:bg-[#1e293b] dark:text-indigo-400"
                    : "border-transparent border-s-4 text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-slate-800/50 dark:hover:text-white"
                }`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
              >
                <Icon
                  className={`h-5 w-5 ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-gray-500"}`}
                />
                <span className="font-semibold">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    ),
    [activeTab]
  );
  return (
    <div className="fade-in mx-auto max-w-7xl animate-in space-y-8 px-4 py-8 duration-500 sm:px-6 lg:px-8">
      <div>
        <h1 className="mb-2 font-bold text-3xl text-gray-900 dark:text-white">
          {t("settings")}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          {t("manage_your_workspace_preferences")}
        </p>
        {role && (
          <p className="mt-1 text-gray-400 text-xs dark:text-gray-500">
            {t("user_role")} {role.name}
          </p>
        )}
      </div>

      <div className="flex flex-col items-start gap-8 md:flex-row">
        {/* Left Sidebar (25%) */}
        {sidebarContent}

        {/* Main Content Area (75%) */}
        <div className="relative min-h-[600px] w-full overflow-hidden md:w-3/4">
          <div
            className={`transform transition-all duration-300 ease-out ${
              activeTab === "appearance"
                ? "block translate-x-0 opacity-100"
                : "hidden translate-x-8 opacity-0"
            }`}
          >
            <div className="space-y-6">
              <section className="rounded-[2.5rem] border border-gray-100 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-[#1e293b]">
                <div className="mb-8 border-gray-100 border-b pb-6 dark:border-slate-800">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="rounded-xl bg-indigo-50 p-2 dark:bg-indigo-900/30">
                      <Palette className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-xl dark:text-white">
                      {t("appearance_settings")}
                    </h3>
                  </div>
                  <p className="text-gray-500 text-sm dark:text-gray-400">
                    {t("customize_the_look_and_feel_of_your_work")}
                  </p>
                </div>

                <div className="space-y-8">
                  <div>
                    <h4 className="mb-4 font-semibold text-gray-900 text-sm dark:text-white">
                      {t("dark_mode")}
                    </h4>
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 dark:border-slate-800 dark:bg-slate-900/50">
                      <ThemeToggle />
                    </div>
                  </div>

                  <div>
                    <h4 className="mb-4 font-semibold text-gray-900 text-sm dark:text-white">
                      {t("measurement_units")}
                    </h4>
                    <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-6 dark:border-slate-800 dark:bg-slate-900/50">
                      <div>
                        <p className="font-medium text-gray-900 text-sm dark:text-white">
                          {t("preferred_system")}
                        </p>
                        <p className="text-gray-500 text-sm dark:text-gray-400">
                          {t("choose_between_metric_or_imperial_units")}
                        </p>
                      </div>
                      <div className="flex rounded-lg border border-gray-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
                        <button
                          className={`rounded-md px-4 py-2 font-medium text-sm transition-colors ${units === "metric" ? "bg-indigo-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"}`}
                          onClick={() => setUnits("metric")}
                        >
                          {t("metric")}
                        </button>
                        <button
                          className={`rounded-md px-4 py-2 font-medium text-sm transition-colors ${units === "imperial" ? "bg-indigo-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"}`}
                          onClick={() => setUnits("imperial")}
                        >
                          {t("imperial")}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div
            className={`transform transition-all duration-300 ease-out ${
              activeTab === "roles"
                ? "block translate-x-0 opacity-100"
                : "hidden translate-x-8 opacity-0"
            }`}
          >
            <section className="overflow-hidden rounded-[2.5rem] border border-gray-100 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1e293b]">
              <div className="border-gray-100 border-b p-8 dark:border-slate-800">
                <div className="mb-2 flex items-center gap-3">
                  <div className="rounded-xl bg-indigo-50 p-2 dark:bg-indigo-900/30">
                    <Shield className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-xl dark:text-white">
                    {t("user_roles_permissions_management")}
                  </h3>
                </div>
                <p className="text-gray-500 text-sm dark:text-gray-400">
                  {t("manage_user_access_across_the_staqato_ma")}
                </p>
              </div>

              <div className="p-8">
                <RoleManagementSection />
              </div>
            </section>
          </div>

          <div
            className={`transform transition-all duration-300 ease-out ${
              activeTab === "traceability"
                ? "block translate-x-0 opacity-100"
                : "hidden translate-x-8 opacity-0"
            } [&>section]:mt-0`}
          >
            <TraceabilityConfig />
          </div>

          <div
            className={`transform transition-all duration-300 ease-out ${
              activeTab === "versionControl"
                ? "block translate-x-0 opacity-100"
                : "hidden translate-x-8 opacity-0"
            } [&>section]:mt-0`}
          >
            <VersionControlConfig />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
