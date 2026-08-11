export type OrganizationSettingsTab =
  | "members"
  | "invites"
  | "auditLog"
  | "traceability"
  | "roles"
  | "versionControl"
  | "productionLine"
  | "settings";

interface OrganizationSettingsAccess {
  canManageProductionLine: boolean;
  canManageVersionControl: boolean;
  isAdmin: boolean;
}

export const MANAGE_VERSION_CONTROL_PERMISSION = "manage_version_control";

export const getVisibleOrganizationSettingsTabs = ({
  canManageVersionControl,
  canManageProductionLine,
  isAdmin,
}: OrganizationSettingsAccess): OrganizationSettingsTab[] => [
  "members",
  "invites",
  "auditLog",
  "traceability",
  ...(isAdmin ? (["roles"] as const) : []),
  ...(canManageVersionControl ? (["versionControl"] as const) : []),
  ...(canManageProductionLine ? (["productionLine"] as const) : []),
  "settings",
];

export const resolveOrganizationSettingsTab = (
  requestedTab: string | null,
  access: OrganizationSettingsAccess
): OrganizationSettingsTab => {
  const visibleTabs = getVisibleOrganizationSettingsTabs(access);
  return visibleTabs.includes(requestedTab as OrganizationSettingsTab)
    ? (requestedTab as OrganizationSettingsTab)
    : visibleTabs[0];
};
