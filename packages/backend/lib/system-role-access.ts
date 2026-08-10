interface ResolveSystemRoleIdArgs<RoleId> {
  adminRoleId: RoleId;
  currentRoleId: RoleId | undefined;
  defaultRoleId: RoleId;
  ownsOrganization: boolean;
}

interface SystemRoleLike {
  key: string;
  permissions: readonly string[];
}

interface SystemRoleKeyLike {
  key: string;
}

const UNASSIGNED_DEFAULT_PERMISSIONS = ["execute_runs"];

export function isConfigurableSystemRole(role: SystemRoleKeyLike): boolean {
  return role.key !== "admin";
}

/**
 * Admin is a stable system role and always receives full access, including
 * when an existing deployment has an older Admin permission list.
 */
export function getEffectiveSystemPermissions(role: SystemRoleLike | null | undefined): string[] {
  if (!role) {
    return [...UNASSIGNED_DEFAULT_PERMISSIONS];
  }

  if (role.key === "admin" && !role.permissions.includes("full_access")) {
    return ["full_access", ...role.permissions];
  }

  return [...role.permissions];
}

export function systemRoleHasPermission(
  role: SystemRoleLike | null | undefined,
  permissionKey: string,
): boolean {
  const permissions = getEffectiveSystemPermissions(role);

  return permissions.includes("full_access") || permissions.includes(permissionKey);
}

export function resolveSystemRoleId<RoleId>({
  adminRoleId,
  currentRoleId,
  defaultRoleId,
  ownsOrganization,
}: ResolveSystemRoleIdArgs<RoleId>): RoleId {
  if (ownsOrganization) {
    return adminRoleId;
  }

  return currentRoleId ?? defaultRoleId;
}
