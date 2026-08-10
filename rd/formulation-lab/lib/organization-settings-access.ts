export type OrganizationSettingsTab =
  | "members"
  | "invites"
  | "auditLog"
  | "productionLine"
  | "settings";

interface OrganizationSettingsAccess {
  canManageProductionLine: boolean;
}

export const getVisibleOrganizationSettingsTabs = ({
  canManageProductionLine,
}: OrganizationSettingsAccess): OrganizationSettingsTab[] => [
  "members",
  "invites",
  "auditLog",
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
