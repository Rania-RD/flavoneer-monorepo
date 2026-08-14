import { api } from "@flavoneer/backend/api";
import { useQuery } from "convex/react";
import { useOrganization } from "../context/OrganizationContext";

export function usePermissions() {
  const { activeOrganizationId, organizationsLoading } = useOrganization();
  const currentUserWithRole = useQuery(
    api.users.getCurrentUserRole,
    activeOrganizationId ? { organizationId: activeOrganizationId } : "skip"
  );
  const isLoading =
    organizationsLoading ||
    (activeOrganizationId !== null && currentUserWithRole === undefined);

  // If waiting for fetch or no user exists, default to fully restricted
  if (
    isLoading ||
    !activeOrganizationId ||
    currentUserWithRole === undefined ||
    currentUserWithRole === null
  ) {
    return {
      isLoading,
      hasPermission: () => false,
      isOrganizationAdmin: false,
      role: null,
      user: null,
      workspaceRole: null,
    };
  }

  const rolePermissions = currentUserWithRole.effectivePermissions;
  const role = currentUserWithRole.role;
  const workspaceRole = currentUserWithRole.workspaceRole;

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
    isOrganizationAdmin: workspaceRole === "owner" || workspaceRole === "admin",
    role,
    isCreator: currentUserWithRole.isCreator === true,
    user: currentUserWithRole,
    workspaceRole,
  };
}
