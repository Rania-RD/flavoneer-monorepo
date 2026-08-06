import { Fingerprint, GitBranch, Palette, Shield } from "lucide-react";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import RoleManagementSection from "../components/Settings/RoleManagementSection";
import TraceabilityConfig from "../components/Settings/TraceabilityConfig";
import VersionControlConfig from "../components/Settings/VersionControlConfig";
import ThemeToggle from "../components/ThemeToggle";
import { usePermissions } from "../hooks/usePermissions";
import { isAdminRole } from "../lib/role-access";
import {
  getVisibleWorkspaceSettingsTabs,
  MANAGE_VERSION_CONTROL_PERMISSION,
  resolveWorkspaceSettingsTab,
  type WorkspaceSettingsTab,
} from "../lib/workspace-settings-access";

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission, isLoading, role } = usePermissions();
  const [units, setUnits] = useState("metric");
  const requestedTab = searchParams.get("tab");
  const isAdmin = isAdminRole(role);
  const canManageVersionControl = hasPermission(
    MANAGE_VERSION_CONTROL_PERMISSION
  );
  const access = { canManageVersionControl, isAdmin };
  const activeTab = resolveWorkspaceSettingsTab(requestedTab, access);

  React.useEffect(() => {
    if (!isLoading && requestedTab !== null && requestedTab !== activeTab) {
      setSearchParams({}, { replace: true });
    }
  }, [activeTab, isLoading, requestedTab, setSearchParams]);

  const tabDefinitions = {
    appearance: { label: t("appearance"), icon: Palette },
    traceability: { label: t("traceability_id"), icon: Fingerprint },
    roles: { label: t("roles_permissions"), icon: Shield },
    versionControl: { label: t("version_control"), icon: GitBranch },
  } as const;
  const tabs = getVisibleWorkspaceSettingsTabs(access).map((id) => ({
    id,
    ...tabDefinitions[id],
  }));

  const selectTab = (tab: WorkspaceSettingsTab) => {
    if (!getVisibleWorkspaceSettingsTabs(access).includes(tab)) {
      return;
    }
    setSearchParams(tab === "appearance" ? {} : { tab }, { replace: true });
  };

  const sidebarContent = (
    <div className="w-full md:w-1/4">
      <nav
        aria-label={t("workspace_settings")}
        className="flex flex-col space-y-2"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              aria-current={isActive ? "page" : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-start transition-all duration-200 ${
                isActive
                  ? "border-[#1c4a3c] border-s-4 bg-[#d2f2d4] text-[#1c4a3c] shadow-sm dark:border-[#f5a623] dark:bg-[#285b4d] dark:text-[#f7f4df]"
                  : "border-transparent border-s-4 text-[#527568] hover:bg-[#d2f2d4]/55 hover:text-[#173e33] dark:text-[#a9cbbb] dark:hover:bg-[#d2f2d4]/10 dark:hover:text-[#f7f4df]"
              }`}
              key={tab.id}
              onClick={() => selectTab(tab.id)}
              type="button"
            >
              <Icon
                aria-hidden="true"
                className={`h-5 w-5 ${isActive ? "text-[#1c4a3c] dark:text-[#f5a623]" : "text-[#6f8e82] dark:text-[#8fb3a4]"}`}
              />
              <span className="font-semibold">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
  return (
    <div className="fade-in mx-auto max-w-7xl animate-in space-y-8 px-4 py-8 duration-500 sm:px-6 lg:px-8">
      <div>
        <h1 className="mb-2 font-bold text-3xl text-gray-900 dark:text-white">
          {t("workspace_settings")}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          {t("manage_your_workspace_preferences")}
        </p>
        {role && (
          <p className="mt-1 text-gray-400 text-xs dark:text-gray-500">
            {t("user_role")} {t(role.key, { defaultValue: role.name })}
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
                    <div className="rounded-xl bg-brand-mint p-2 dark:bg-brand-accent/30">
                      <Palette className="h-6 w-6 text-brand-primary dark:text-brand-accent-hover" />
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
                          className={`rounded-md px-4 py-2 font-medium text-sm transition-colors ${units === "metric" ? "bg-brand-primary text-white shadow-sm" : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"}`}
                          onClick={() => setUnits("metric")}
                          type="button"
                        >
                          {t("metric")}
                        </button>
                        <button
                          className={`rounded-md px-4 py-2 font-medium text-sm transition-colors ${units === "imperial" ? "bg-brand-primary text-white shadow-sm" : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"}`}
                          onClick={() => setUnits("imperial")}
                          type="button"
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

          {isAdmin && (
            <div
              className={`transform transition-all duration-300 ease-out ${
                activeTab === "roles"
                  ? "block translate-x-0 opacity-100"
                  : "hidden translate-x-8 opacity-0"
              }`}
            >
              <section className="overflow-hidden rounded-[2.5rem] border border-[#1c4a3c]/10 bg-[#fffdf4] shadow-sm dark:border-[#d2f2d4]/10 dark:bg-[#173e33]">
                <div className="border-[#1c4a3c]/10 border-b px-8 py-6 dark:border-[#d2f2d4]/10">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="rounded-xl bg-[#d2f2d4] p-2 dark:bg-[#285b4d]">
                      <Shield
                        aria-hidden="true"
                        className="h-6 w-6 text-[#1c4a3c] dark:text-[#f5a623]"
                      />
                    </div>
                    <h3 className="font-bold text-[#173e33] text-xl dark:text-[#f7f4df]">
                      {t("user_roles_permissions_management")}
                    </h3>
                  </div>
                  <p className="text-[#527568] text-sm dark:text-[#a9cbbb]">
                    {t("manage_user_access_across_the_staqato_ma")}
                  </p>
                </div>
                <div className="p-8">
                  <RoleManagementSection />
                </div>
              </section>
            </div>
          )}

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
