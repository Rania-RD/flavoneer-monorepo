import { api } from "@flavoneer/backend/api";
import type { Id } from "@flavoneer/backend/data-model";
import {
  getEffectiveSystemPermissions,
  isConfigurableSystemRole,
} from "@flavoneer/backend/system-role-access";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { useMutation, useQuery } from "convex/react";
import { Check, Loader2, ShieldAlert, Users } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useOrganization } from "../../context/OrganizationContext";
import { usePermissions } from "../../hooks/usePermissions";
import { LabDataGrid } from "../ui/LabDataGrid";
import { Switch } from "../ui/Switch";

// Available permission toggles in the system
const AVAILABLE_PERMISSIONS = [
  {
    key: "full_access",
    label: "full_system_access",
    desc: "Can perform all actions, including modifying roles.",
  },
  {
    key: "manage_roles",
    label: "manage_roles",
    desc: "Can assign roles to users and modify permissions.",
  },
  {
    key: "manage_version_control",
    label: "manage_version_control",
    desc: "Can configure workspace version-control behavior.",
  },
  {
    key: "edit_procedures",
    label: "edit_procedures",
    desc: "Can create and modify project formulations and phases.",
  },
  {
    key: "sign_off",
    label: "sign_off_approval",
    desc: "Can approve and sign off on completed runs.",
  },
  {
    key: "execute_runs",
    label: "execute_runs",
    desc: "Can start and complete execution of formulation runs.",
  },
];

type PermissionRow = (typeof AVAILABLE_PERMISSIONS)[number];

const haveSamePermissions = (
  first: readonly string[] | undefined,
  second: readonly string[]
) =>
  JSON.stringify([...(first ?? [])].sort()) ===
  JSON.stringify([...second].sort());

const RoleManagementSection: React.FC = () => {
  const { t } = useTranslation();
  const { activeOrganizationId } = useOrganization();
  const { isLoading: isPermissionLoading, isOrganizationAdmin } =
    usePermissions();
  const canManageRoles = isOrganizationAdmin;
  const roleQueryArgs =
    canManageRoles && activeOrganizationId
      ? { organizationId: activeOrganizationId }
      : "skip";
  const roles = useQuery(api.roles.list, roleQueryArgs);
  const users = useQuery(api.organizationMembers.listWithRoles, roleQueryArgs);
  const matrixRoles = roles?.filter(isConfigurableSystemRole) ?? [];
  const updateRolePermissions = useMutation(api.roles.updateRolePermissions);
  const updateUserRole = useMutation(api.organizationMembers.updateSystemRole);

  const [activeTab, setActiveTab] = useState<"matrix" | "users">("matrix");

  // Local state for role permissions to allow editing before saving
  const [localPermissions, setLocalPermissions] = useState<
    Record<string, string[]>
  >({});
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const [permissionsSaved, setPermissionsSaved] = useState(false);

  // Local state for user roles to allow editing before saving
  const [localUserRoles, setLocalUserRoles] = useState<Record<string, string>>(
    {}
  );
  const [isSavingUsers, setIsSavingUsers] = useState(false);
  const [usersSaved, setUsersSaved] = useState(false);

  // Initialize local permissions when roles load
  useEffect(() => {
    if (roles) {
      const initialMap: Record<string, string[]> = {};
      for (const currentRole of roles) {
        if (isConfigurableSystemRole(currentRole)) {
          initialMap[currentRole._id] =
            getEffectiveSystemPermissions(currentRole);
        }
      }
      setLocalPermissions(initialMap);
    }
  }, [roles]);

  // Initialize local users when users load
  useEffect(() => {
    if (users) {
      const initialMap: Record<string, string> = {};
      users.forEach((u) => {
        if (u.roleId) {
          initialMap[u._id] = u.roleId;
        }
      });
      setLocalUserRoles(initialMap);
    }
  }, [users]);

  const handleTogglePermission = (roleId: string, permKey: string) => {
    setLocalPermissions((prev) => {
      const current = prev[roleId] || [];
      const updated = current.includes(permKey)
        ? current.filter((p) => p !== permKey) // remove
        : [...current, permKey]; // add

      // Re-evaluate 'full_access' logic if needed, but for now simple toggle
      return {
        ...prev,
        [roleId]: updated,
      };
    });
    setPermissionsSaved(false);
  };

  const handleSavePermissions = async () => {
    if (!(roles && activeOrganizationId)) {
      return;
    }
    setIsSavingPermissions(true);
    setPermissionsSaved(false);

    try {
      const promises = matrixRoles.map(async (role) => {
        const newPerms = localPermissions[role._id];
        // Only save roles whose permission set changed.
        if (!haveSamePermissions(newPerms, role.permissions)) {
          await updateRolePermissions({
            organizationId: activeOrganizationId,
            roleId: role._id as Id<"roles">,
            permissions: newPerms,
          });
        }
      });
      await Promise.all(promises);
      setPermissionsSaved(true);
      setTimeout(() => setPermissionsSaved(false), 3000);
    } catch (error) {
      console.error("Failed to save permissions:", error);
    } finally {
      setIsSavingPermissions(false);
    }
  };

  const handleUserRoleChange = (userId: string, roleId: string) => {
    setLocalUserRoles((prev) => ({ ...prev, [userId]: roleId }));
    setUsersSaved(false);
  };

  const handleSaveUsers = async () => {
    if (!(users && activeOrganizationId)) {
      return;
    }
    setIsSavingUsers(true);
    setUsersSaved(false);

    try {
      const promises = users.map(async (user) => {
        const newRoleId = localUserRoles[user._id];
        if (newRoleId && newRoleId !== user.roleId) {
          await updateUserRole({
            organizationId: activeOrganizationId,
            memberId: user._id,
            newRoleId: newRoleId as Id<"roles">,
          });
        }
      });
      await Promise.all(promises);
      setUsersSaved(true);
      setTimeout(() => setUsersSaved(false), 3000);
    } catch (error) {
      console.error("Failed to save users:", error);
    } finally {
      setIsSavingUsers(false);
    }
  };

  const hasPermissionChanges = matrixRoles.some(
    (role) => !haveSamePermissions(localPermissions[role._id], role.permissions)
  );

  const hasUserChanges = users?.some(
    (user) =>
      localUserRoles[user._id] && localUserRoles[user._id] !== user.roleId
  );
  const permissionColumnDefs = useMemo<ColDef<PermissionRow>[]>(
    () => [
      {
        cellRenderer: ({ data }: ICellRendererParams<PermissionRow>) =>
          data ? (
            <div className="min-w-0 py-2">
              <div className="truncate font-medium">{t(data.label)}</div>
              <div className="mt-1 truncate text-[#527568] text-xs dark:text-[#a9cbbb]">
                {t(data.desc)}
              </div>
            </div>
          ) : null,
        field: "label",
        flex: 1,
        headerName: t("permission"),
        minWidth: 280,
      },
      ...matrixRoles.map(
        (currentRole): ColDef<PermissionRow> => ({
          cellRenderer: ({ data }: ICellRendererParams<PermissionRow>) =>
            data ? (
              <div className="flex w-full justify-center">
                <Switch
                  checked={
                    localPermissions[currentRole._id]?.includes(data.key) ??
                    false
                  }
                  onChange={() =>
                    handleTogglePermission(currentRole._id, data.key)
                  }
                />
              </div>
            ) : null,
          colId: currentRole._id,
          cellClass: "lab-grid-align-center",
          filter: false,
          headerName: t(currentRole.key, {
            defaultValue: currentRole.name,
          }),
          headerClass: "lab-grid-align-center",
          minWidth: 140,
          sortable: false,
        })
      ),
    ],
    [localPermissions, matrixRoles, t]
  );
  type UserRow = NonNullable<typeof users>[number];
  const userColumnDefs = useMemo<ColDef<UserRow>[]>(
    () => [
      {
        cellRenderer: ({ data }: ICellRendererParams<UserRow>) =>
          data ? (
            <div className="min-w-0 py-2">
              <div className="truncate font-semibold">
                {data.userName || t("unknown_user")}
              </div>
              <div className="mt-1 truncate text-[#527568] text-xs dark:text-[#a9cbbb]">
                {data.userEmail || t("no_email_provided")}
              </div>
            </div>
          ) : null,
        field: "userName",
        flex: 1,
        headerName: t("user_name"),
        minWidth: 240,
      },
      {
        cellRenderer: ({ data }: ICellRendererParams<UserRow>) =>
          data ? (
            <select
              aria-label={t("selectRole")}
              className="w-full max-w-[220px] rounded-xl border border-[#1c4a3c]/15 bg-[#fffdf4] px-3 py-2 text-[#173e33] text-sm outline-none focus:ring-2 focus:ring-brand-focus/50 dark:border-[#d2f2d4]/15 dark:bg-[#102f27] dark:text-[#f7f4df]"
              onChange={(event) =>
                handleUserRoleChange(data._id, event.target.value)
              }
              value={localUserRoles[data._id] || ""}
            >
              <option disabled value="">
                {t("selectRole")}
              </option>
              {roles?.map((currentRole) => (
                <option key={currentRole._id} value={currentRole._id}>
                  {t(currentRole.key, { defaultValue: currentRole.name })}
                </option>
              ))}
            </select>
          ) : null,
        colId: "role",
        cellClass: "lab-grid-align-end",
        filter: false,
        flex: 0.7,
        headerName: t("role"),
        minWidth: 210,
        sortable: false,
      },
    ],
    [localUserRoles, roles, t]
  );

  if (isPermissionLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!canManageRoles) {
    return (
      <div className="rounded-[1.5rem] border border-gray-100 bg-gray-50 p-8 text-center dark:border-slate-800 dark:bg-slate-900/40">
        <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-gray-400 dark:text-slate-500" />
        <h4 className="font-semibold text-gray-900 text-sm dark:text-white">
          {t("access_denied")}
        </h4>
        <p className="mt-2 text-gray-500 text-sm dark:text-gray-400">
          {t("role_management_requires_admin")}
        </p>
      </div>
    );
  }

  if (roles === undefined || users === undefined) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex space-x-2 border-gray-100 border-b pb-2 dark:border-slate-800">
        <button
          className={`flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-sm transition-all ${
            activeTab === "matrix"
              ? "bg-brand-mint text-brand-primary dark:bg-brand-accent/30 dark:text-brand-accent-hover"
              : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-white"
          }`}
          onClick={() => setActiveTab("matrix")}
          type="button"
        >
          <ShieldAlert size={16} />

          {t("permissions_matrix")}
        </button>
        <button
          className={`flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-sm transition-all ${
            activeTab === "users"
              ? "bg-brand-mint text-brand-primary dark:bg-brand-accent/30 dark:text-brand-accent-hover"
              : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-white"
          }`}
          onClick={() => setActiveTab("users")}
          type="button"
        >
          <Users size={16} />

          {t("user_assignment")}
        </button>
      </div>

      {/* Matrix Tab */}
      {activeTab === "matrix" && (
        <div className="fade-in animate-in space-y-6 duration-300">
          <div className="overflow-hidden rounded-[1.5rem] border border-gray-100 dark:border-slate-800">
            <LabDataGrid<PermissionRow>
              className="lab-data-grid--settings"
              columnDefs={permissionColumnDefs}
              defaultColDef={{
                filter: false,
                suppressHeaderMenuButton: true,
              }}
              getRowId={({ data }) => data.key}
              headerHeight={52}
              rowData={AVAILABLE_PERMISSIONS}
              rowHeight={68}
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            {permissionsSaved && (
              <span className="fade-in slide-in-from-end-4 flex animate-in items-center font-medium text-green-600 text-sm dark:text-green-400">
                <Check className="me-1 h-4 w-4" /> {t("matrix_updated")}
              </span>
            )}
            <button
              className={`rounded-xl px-6 py-2.5 font-semibold text-sm transition-all ${
                hasPermissionChanges && !isSavingPermissions
                  ? "bg-gray-900 text-white shadow-md hover:scale-105 dark:bg-brand-accent"
                  : "cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-slate-500"
              }`}
              disabled={!hasPermissionChanges || isSavingPermissions}
              onClick={handleSavePermissions}
              type="button"
            >
              {isSavingPermissions ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> {t("saving")}
                </span>
              ) : (
                t("save_matrix")
              )}
            </button>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="fade-in animate-in space-y-6 duration-300">
          <div className="overflow-hidden rounded-[1.5rem] border border-gray-100 dark:border-slate-800">
            <LabDataGrid<UserRow>
              className="lab-data-grid--settings"
              columnDefs={userColumnDefs}
              defaultColDef={{
                filter: false,
                sortable: false,
                suppressHeaderMenuButton: true,
              }}
              getRowId={({ data }) => data._id}
              headerHeight={0}
              overlayNoRowsTemplate={t("no_users_found_in_the_system")}
              rowData={users}
              rowHeight={68}
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            {usersSaved && (
              <span className="fade-in slide-in-from-end-4 flex animate-in items-center font-medium text-green-600 text-sm dark:text-green-400">
                <Check className="me-1 h-4 w-4" /> {t("assignments_saved")}
              </span>
            )}
            <button
              className={`rounded-xl px-6 py-2.5 font-semibold text-sm transition-all ${
                hasUserChanges && !isSavingUsers
                  ? "bg-gray-900 text-white shadow-md hover:scale-105 dark:bg-brand-accent"
                  : "cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-slate-500"
              }`}
              disabled={!hasUserChanges || isSavingUsers}
              onClick={handleSaveUsers}
              type="button"
            >
              {isSavingUsers ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> {t("saving")}
                </span>
              ) : (
                t("save_assignments")
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagementSection;
