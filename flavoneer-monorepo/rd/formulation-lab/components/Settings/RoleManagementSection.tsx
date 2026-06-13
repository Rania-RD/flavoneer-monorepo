import { useMutation, useQuery } from "convex/react";
import { Check, Loader2, ShieldAlert, Users } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { usePermissions } from "../../hooks/usePermissions";
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

const RoleManagementSection: React.FC = () => {
  const { t } = useTranslation();
  const { hasPermission, isLoading: isPermissionLoading } = usePermissions();
  const canManageRoles = hasPermission("manage_roles");
  const roles = useQuery(api.roles.list, canManageRoles ? {} : "skip");
  const users = useQuery(
    api.users.listUsersWithRoles,
    canManageRoles ? {} : "skip"
  );
  const updateRolePermissions = useMutation(api.roles.updateRolePermissions);
  const updateUserRole = useMutation(api.users.updateUserRole);

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
      roles.forEach((r) => {
        initialMap[r._id] = [...r.permissions];
      });
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
    if (!roles) {
      return;
    }
    setIsSavingPermissions(true);
    setPermissionsSaved(false);

    try {
      const promises = roles.map(async (role) => {
        const newPerms = localPermissions[role._id];
        // Only save if different (shallow compare is fine here)
        if (
          JSON.stringify(newPerms?.sort()) !==
          JSON.stringify(role.permissions.sort())
        ) {
          await updateRolePermissions({
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
    if (!users) {
      return;
    }
    setIsSavingUsers(true);
    setUsersSaved(false);

    try {
      const promises = users.map(async (user) => {
        const newRoleId = localUserRoles[user._id];
        if (newRoleId && newRoleId !== user.roleId) {
          await updateUserRole({
            userId: user._id as Id<"users">,
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

  const hasPermissionChanges = roles?.some(
    (role) =>
      JSON.stringify(localPermissions[role._id]?.sort()) !==
      JSON.stringify(role.permissions.sort())
  );

  const hasUserChanges = users?.some(
    (user) =>
      localUserRoles[user._id] && localUserRoles[user._id] !== user.roleId
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
          {t("role_management_requires_permission")}
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
              ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
              : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-white"
          }`}
          onClick={() => setActiveTab("matrix")}
        >
          <ShieldAlert size={16} />

          {t("permissions_matrix")}
        </button>
        <button
          className={`flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-sm transition-all ${
            activeTab === "users"
              ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
              : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-white"
          }`}
          onClick={() => setActiveTab("users")}
        >
          <Users size={16} />

          {t("user_assignment")}
        </button>
      </div>

      {/* Matrix Tab */}
      {activeTab === "matrix" && (
        <div className="fade-in animate-in space-y-6 duration-300">
          <div className="overflow-x-auto rounded-[1.5rem] border border-gray-100 dark:border-slate-800">
            <table className="w-full border-collapse text-start">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-800/50">
                  <th className="border-gray-100 border-b p-4 text-start font-semibold text-gray-900 text-sm dark:border-slate-800 dark:text-white">
                    {t("permission")}
                  </th>
                  {roles.map((role) => (
                    <th
                      className="min-w-[120px] border-gray-100 border-b p-4 text-center font-semibold text-gray-900 text-sm dark:border-slate-800 dark:text-white"
                      key={role._id}
                    >
                      {role.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {AVAILABLE_PERMISSIONS.map((perm) => (
                  <tr
                    className="border-gray-50 border-b transition-colors last:border-0 hover:bg-gray-50/50 dark:border-slate-800/50 dark:hover:bg-slate-800/20"
                    key={perm.key}
                  >
                    <td className="p-4 text-start">
                      <div className="font-medium text-gray-900 text-sm dark:text-white">
                        {t(perm.label)}
                      </div>
                      <div className="mt-1 text-gray-400 text-xs dark:text-slate-500">
                        {t(perm.desc)}
                      </div>
                    </td>
                    {roles.map((role) => {
                      const isChecked = localPermissions[role._id]?.includes(
                        perm.key
                      );
                      // Optional: disable editing 'admin' role directly to prevent lockout,
                      // but allowing it for flexibility as per prompt. We'll leave it enabled.
                      const roleIsAdmin =
                        role.key === "admin" && perm.key === "full_access";
                      return (
                        <td
                          className="p-4 text-center align-middle"
                          key={role._id}
                        >
                          <Switch
                            checked={!!isChecked}
                            disabled={roleIsAdmin}
                            onChange={() =>
                              handleTogglePermission(role._id, perm.key)
                            }
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
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
                  ? "bg-gray-900 text-white shadow-md hover:scale-105 dark:bg-indigo-600"
                  : "cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-slate-500"
              }`}
              disabled={!hasPermissionChanges || isSavingPermissions}
              onClick={handleSavePermissions}
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
          <div className="block rounded-[1.5rem] border border-gray-100 bg-gray-50 p-2 dark:border-slate-800 dark:bg-slate-800/30">
            {users.map((user) => (
              <div
                className="flex items-center justify-between rounded-xl border-gray-100 border-b p-4 transition-colors last:border-0 hover:bg-white dark:border-slate-800 dark:hover:bg-slate-800"
                key={user._id}
              >
                <div className="flex flex-col">
                  <span className="font-semibold text-gray-900 text-sm dark:text-white">
                    {user.name || t("unknown_user")}
                  </span>
                  <span className="text-gray-500 text-xs dark:text-gray-400">
                    {user.email || t("no_email_provided")}
                  </span>
                </div>

                <select
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100"
                  onChange={(e) =>
                    handleUserRoleChange(user._id, e.target.value)
                  }
                  value={localUserRoles[user._id] || ""}
                >
                  <option disabled value="">
                    {t("selectRole")}
                  </option>
                  {roles.map((role) => (
                    <option key={role._id} value={role._id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            {users.length === 0 && (
              <p className="py-8 text-center text-gray-500 text-sm dark:text-gray-400">
                {t("no_users_found_in_the_system")}
              </p>
            )}
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
                  ? "bg-gray-900 text-white shadow-md hover:scale-105 dark:bg-indigo-600"
                  : "cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-slate-500"
              }`}
              disabled={!hasUserChanges || isSavingUsers}
              onClick={handleSaveUsers}
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
