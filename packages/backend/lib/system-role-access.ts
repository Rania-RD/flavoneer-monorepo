interface ResolveSystemRoleIdArgs<RoleId> {
  adminRoleId: RoleId;
  currentRoleId: RoleId | undefined;
  defaultRoleId: RoleId;
  ownsTeam: boolean;
}

export function resolveSystemRoleId<RoleId>({
  adminRoleId,
  currentRoleId,
  defaultRoleId,
  ownsTeam,
}: ResolveSystemRoleIdArgs<RoleId>): RoleId {
  if (ownsTeam) {
    return adminRoleId;
  }

  return currentRoleId ?? defaultRoleId;
}
