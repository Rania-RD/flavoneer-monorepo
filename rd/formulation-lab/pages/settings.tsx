import { motion } from "framer-motion";
import {
  Building2,
  Factory,
  Fingerprint,
  GitBranch,
  History,
  Languages,
  Loader2,
  LogOut,
  type LucideIcon,
  Mail,
  Palette,
  Shield,
  User,
  UsersRound,
} from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import AppearanceTab from "../components/profile/AppearanceTab";
import IdentityTab from "../components/profile/IdentityTab";
import LocalizationTab from "../components/profile/LocalizationTab";
import { useOrganization } from "../context/OrganizationContext";
import { useSettings } from "../context/SettingsContext";
import { usePermissions } from "../hooks/usePermissions";
import {
  getVisibleOrganizationSettingsTabs,
  MANAGE_VERSION_CONTROL_PERMISSION,
  type OrganizationSettingsTab,
  resolveOrganizationSettingsTab,
} from "../lib/organization-settings-access";
import OrganizationPage from "./organization";

type SettingsScope = "user" | "organization";
type UserSettingsTab = "identity" | "localization" | "appearance";

interface NavigationItem<T extends string> {
  icon: LucideIcon;
  id: T;
  label: string;
}

const SETTINGS_SCOPES = new Set<SettingsScope>(["user", "organization"]);
const USER_TABS = new Set<UserSettingsTab>([
  "identity",
  "localization",
  "appearance",
]);

function resolveSettingsScope(requestedScope: string | null): SettingsScope {
  if (SETTINGS_SCOPES.has(requestedScope as SettingsScope)) {
    return requestedScope as SettingsScope;
  }
  if (requestedScope === "workspace") {
    return "organization";
  }
  return "user";
}

function NestedNavigation<T extends string>({
  activeId,
  ariaLabel,
  items,
  onSelect,
}: {
  activeId: T;
  ariaLabel: string;
  items: NavigationItem<T>[];
  onSelect: (id: T) => void;
}) {
  return (
    <nav
      aria-label={ariaLabel}
      className="flex gap-2 overflow-x-auto pb-2 md:flex-col md:overflow-visible md:pb-0"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.id === activeId;
        return (
          <button
            aria-current={isActive ? "page" : undefined}
            className={`flex min-w-max items-center gap-3 rounded-xl border-s-4 px-4 py-3 text-start font-semibold text-sm transition-all duration-200 md:w-full ${
              isActive
                ? "border-[#1c4a3c] bg-[#d2f2d4] text-[#1c4a3c] shadow-sm dark:border-[#f5a623] dark:bg-[#285b4d] dark:text-[#f7f4df]"
                : "border-transparent text-[#527568] hover:bg-[#d2f2d4]/55 hover:text-[#173e33] dark:text-[#a9cbbb] dark:hover:bg-[#d2f2d4]/10 dark:hover:text-[#f7f4df]"
            }`}
            key={item.id}
            onClick={() => onSelect(item.id)}
            type="button"
          >
            <Icon
              aria-hidden="true"
              className={
                isActive
                  ? "text-[#1c4a3c] dark:text-[#f5a623]"
                  : "text-[#6f8e82] dark:text-[#8fb3a4]"
              }
              size={19}
            />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission, isLoading, isOrganizationAdmin } = usePermissions();
  const {
    currentRole: organizationRole,
    organizations,
    organizationsLoading,
  } = useOrganization();
  const { language, profile, setLanguage, signOut, updateProfile } =
    useSettings();
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const requestedScope = searchParams.get("scope");
  const activeScope = resolveSettingsScope(requestedScope);
  const requestedTab = searchParams.get("tab");
  const isAdmin = isOrganizationAdmin;
  const canManageProductionLine = isOrganizationAdmin;
  const isOrganizationAccessLoading =
    organizationsLoading ||
    (organizations.length > 0 && organizationRole === null);
  const access = {
    canManageVersionControl: hasPermission(MANAGE_VERSION_CONTROL_PERMISSION),
    isAdmin,
  };

  const userActiveTab = USER_TABS.has(requestedTab as UserSettingsTab)
    ? (requestedTab as UserSettingsTab)
    : "identity";
  const organizationActiveTab = resolveOrganizationSettingsTab(requestedTab, {
    ...access,
    canManageProductionLine,
  });

  React.useEffect(() => {
    if (isLoading || isOrganizationAccessLoading) {
      return;
    }
    const activeTab =
      activeScope === "user" ? userActiveTab : organizationActiveTab;
    const invalidScope =
      requestedScope !== null && requestedScope !== activeScope;
    const invalidTab = requestedTab !== null && requestedTab !== activeTab;
    if (invalidScope || invalidTab) {
      const params: Record<string, string> = { scope: activeScope };
      if (requestedTab !== null && requestedTab === activeTab) {
        params.tab = activeTab;
      }
      setSearchParams(params, { replace: true });
    }
  }, [
    activeScope,
    isOrganizationAccessLoading,
    isLoading,
    organizationActiveTab,
    requestedScope,
    requestedTab,
    setSearchParams,
    userActiveTab,
  ]);

  const scopeItems: NavigationItem<SettingsScope>[] = [
    { id: "user", label: t("user_settings"), icon: User },
    {
      id: "organization",
      label: t("organizationSettings"),
      icon: Building2,
    },
  ];
  const userItems: NavigationItem<UserSettingsTab>[] = [
    { id: "identity", label: t("identity"), icon: User },
    { id: "localization", label: t("localization"), icon: Languages },
    { id: "appearance", label: t("appearance"), icon: Palette },
  ];
  const organizationDefinitions: Record<
    OrganizationSettingsTab,
    Omit<NavigationItem<OrganizationSettingsTab>, "id">
  > = {
    members: { label: t("members"), icon: UsersRound },
    invites: { label: t("invites"), icon: Mail },
    auditLog: { label: t("auditLog"), icon: History },
    traceability: { label: t("traceability_id"), icon: Fingerprint },
    roles: { label: t("roles_permissions"), icon: Shield },
    versionControl: { label: t("version_control"), icon: GitBranch },
    productionLine: {
      label: t("production_line_settings"),
      icon: Factory,
    },
    settings: { label: t("settings"), icon: Shield },
  };
  const organizationItems = getVisibleOrganizationSettingsTabs({
    ...access,
    canManageProductionLine,
  }).map((id) => ({ id, ...organizationDefinitions[id] }));

  const selectScope = (scope: SettingsScope) => {
    setSearchParams({ scope });
  };
  const selectNestedTab = (tab: string) => {
    const params: Record<string, string> = { tab };
    params.scope = activeScope;
    setSearchParams(params);
  };
  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out failed:", error);
      setIsSigningOut(false);
    }
  };

  const renderUserContent = () => (
    <section className="overflow-hidden rounded-[2.5rem] border border-[#1c4a3c]/10 bg-[#fffdf4] shadow-sm dark:border-[#d2f2d4]/10 dark:bg-[#173e33]">
      <div className="border-[#1c4a3c]/10 border-b px-6 py-5 sm:px-8 dark:border-[#d2f2d4]/10">
        <h2 className="font-bold text-[#173e33] text-xl dark:text-[#f7f4df]">
          {userItems.find((item) => item.id === userActiveTab)?.label}
        </h2>
      </div>
      <div className="p-6 sm:p-8">
        {userActiveTab === "identity" && (
          <IdentityTab profile={profile} updateProfile={updateProfile} />
        )}
        {userActiveTab === "localization" && (
          <LocalizationTab
            currentLanguage={language}
            setLanguage={setLanguage}
          />
        )}
        {userActiveTab === "appearance" && <AppearanceTab />}
      </div>
    </section>
  );

  const activeNestedNavigation =
    activeScope === "user" ? (
      <NestedNavigation
        activeId={userActiveTab}
        ariaLabel={t("user_settings")}
        items={userItems}
        onSelect={selectNestedTab}
      />
    ) : (
      <NestedNavigation
        activeId={organizationActiveTab}
        ariaLabel={t("organizationSettings")}
        items={organizationItems}
        onSelect={selectNestedTab}
      />
    );

  return (
    <div className="fade-in mx-auto max-w-7xl animate-in px-2 pb-4 duration-500 sm:px-4 sm:pb-8">
      <header className="mb-7">
        <div>
          <h1 className="font-bold text-3xl text-[#173e33] dark:text-[#f7f4df]">
            {t("settings")}
          </h1>
          <p className="mt-2 max-w-2xl text-[#527568] dark:text-[#a9cbbb]">
            {t("settings_overview_description")}
          </p>
        </div>
      </header>

      <div
        aria-label={t("settings")}
        className="mb-8 flex gap-2 overflow-x-auto border-[#1c4a3c]/10 border-b pb-px dark:border-[#d2f2d4]/10"
        role="tablist"
      >
        {scopeItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeScope;
          return (
            <button
              aria-selected={isActive}
              className={`relative flex min-w-max items-center gap-2 px-4 py-3 font-bold text-sm transition-colors ${
                isActive
                  ? "text-[#173e33] dark:text-[#f5a623]"
                  : "text-[#6f8e82] hover:text-[#173e33] dark:text-[#8fb3a4] dark:hover:text-[#f7f4df]"
              }`}
              key={item.id}
              onClick={() => selectScope(item.id)}
              role="tab"
              type="button"
            >
              <Icon aria-hidden="true" size={18} />
              {item.label}
              {isActive && (
                <motion.span
                  className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[#1c4a3c] dark:bg-[#f5a623]"
                  layoutId="settings-scope-indicator"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="grid items-start gap-7 md:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="min-w-0">
          {activeNestedNavigation}
          {activeScope === "user" && (
            <div className="mt-4 border-[#1c4a3c]/10 border-t pt-4 dark:border-[#d2f2d4]/10">
              <button
                aria-busy={isSigningOut}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 font-bold text-[#a43f20] text-sm transition-colors hover:bg-[#ff7738]/10 disabled:cursor-wait disabled:opacity-60 dark:text-[#ffc5b2]"
                disabled={isSigningOut}
                onClick={handleSignOut}
                type="button"
              >
                {isSigningOut ? (
                  <Loader2
                    aria-hidden="true"
                    className="animate-spin"
                    size={19}
                  />
                ) : (
                  <LogOut
                    aria-hidden="true"
                    className="rtl-mirror-icon"
                    size={19}
                  />
                )}
                {t("logout")}
              </button>
            </div>
          )}
        </aside>

        <main className="min-h-[580px] min-w-0">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
          >
            {activeScope === "user" && renderUserContent()}
            {activeScope === "organization" && (
              <OrganizationPage
                activeTab={organizationActiveTab}
                embedded
                onActiveTabChange={selectNestedTab}
              />
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default Settings;
