export const MANAGE_VERSION_CONTROL_PERMISSION = "manage_version_control";

export type WorkspaceSettingsTab =
  | "appearance"
  | "traceability"
  | "roles"
  | "versionControl";

interface WorkspaceSettingsAccess {
  canManageVersionControl: boolean;
  isAdmin: boolean;
}

export const getVisibleWorkspaceSettingsTabs = ({
  canManageVersionControl,
  isAdmin,
}: WorkspaceSettingsAccess): WorkspaceSettingsTab[] => [
  "appearance",
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
    : "appearance";
};
