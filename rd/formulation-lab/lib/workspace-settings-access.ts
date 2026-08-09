export const MANAGE_VERSION_CONTROL_PERMISSION = "manage_version_control";

export type WorkspaceSettingsTab = "traceability" | "roles" | "versionControl";

interface WorkspaceSettingsAccess {
  canManageVersionControl: boolean;
  isAdmin: boolean;
}

export const getVisibleWorkspaceSettingsTabs = ({
  canManageVersionControl,
  isAdmin,
}: WorkspaceSettingsAccess): WorkspaceSettingsTab[] => [
  "traceability",
  ...(isAdmin ? (["roles"] as const) : []),
  ...(canManageVersionControl ? (["versionControl"] as const) : []),
];

export const resolveWorkspaceSettingsTab = (
  requestedTab: string | null,
  access: WorkspaceSettingsAccess
): WorkspaceSettingsTab => {
  const visibleTabs = getVisibleWorkspaceSettingsTabs(access);
  return visibleTabs.includes(requestedTab as WorkspaceSettingsTab)
    ? (requestedTab as WorkspaceSettingsTab)
    : visibleTabs[0];
};
