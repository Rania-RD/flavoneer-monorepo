import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export function usePermissions() {
  const currentUserWithRole = useQuery(api.users.getCurrentUserRole);
  const isLoading = currentUserWithRole === undefined;

  // If waiting for fetch or no user exists, default to fully restricted
  if (isLoading || currentUserWithRole === null) {
    return {
      isLoading,
      hasPermission: () => false,
      role: null,
      user: null,
    };
  }

  const rolePermissions = currentUserWithRole.effectivePermissions;
  const role = currentUserWithRole.role;

  /**
   * Checks if the user has a specific permission.
   * UI-only check. Convex queries and mutations still enforce permissions.
   */
  const hasPermission = (permissionKey: string) => {
    if (rolePermissions.includes("full_access")) {
      return true;
    }
    return rolePermissions.includes(permissionKey);
  };

  return {
    isLoading: false,
    hasPermission,
    role,
    isCreator: currentUserWithRole.isCreator === true,
    user: currentUserWithRole,
  };
}
