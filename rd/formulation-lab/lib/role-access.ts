interface RoleLike {
  key: string;
}

export const isAdminRole = (
  role: RoleLike | null | undefined
): role is RoleLike => role?.key === "admin";
