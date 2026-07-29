import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeftRight,
  Building2,
  CheckCircle2,
  Clock,
  Crown,
  History,
  LogOut,
  Mail,
  MailPlus,
  MoreHorizontal,
  PartyPopper,
  PencilLine,
  Plus,
  Shield,
  Trash2,
  User,
  UserMinus,
  UsersRound,
  UserX,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import InviteMemberModal from "../components/InviteMemberModal";
import { useTeam } from "../context/TeamContext";
import { api } from "../convex/_generated/api";
import { useToast } from "../hooks/useToast";

// ─── Role badge component ────────────────────────────
const RoleBadge: React.FC<{ role: string; t: (k: string) => string }> = ({
  role,
  t,
}) => {
  const styles: Record<string, string> = {
    owner:
      "bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700/30",
    admin:
      "bg-violet-100 dark:bg-violet-900/20 text-violet-800 dark:text-violet-300 border border-violet-200 dark:border-violet-700/30",
    member:
      "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-600",
  };
  const icons: Record<string, React.ReactNode> = {
    owner: <Crown size={12} />,
    admin: <Shield size={12} />,
    member: <User size={12} />,
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-bold text-[10px] ${styles[role] ?? styles.member}`}
    >
      {icons[role]}
      {t(role)}
    </span>
  );
};

// ─── Invite status badge ─────────────────────────────
const InviteStatusBadge: React.FC<{
  status: string;
  t: (k: string) => string;
}> = ({ status, t }) => {
  const styles: Record<string, string> = {
    pending:
      "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300",
    accepted:
      "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300",
    revoked: "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300",
  };
  const icons: Record<string, React.ReactNode> = {
    pending: <Clock size={12} />,
    accepted: <CheckCircle2 size={12} />,
    revoked: <XCircle size={12} />,
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-bold text-[10px] ${styles[status] ?? styles.pending}`}
    >
      {icons[status]}
      {t(status)}
    </span>
  );
};

// ─── Audit action label formatting ───────────────────
function formatAction(action: string, t: ReturnType<typeof useTranslation>["t"]): React.ReactNode {
  const map: Record<string, { icon: LucideIcon; key: string }> = {
    "team.created": { icon: Building2, key: "team_created_action" },
    "team.updated": { icon: PencilLine, key: "team_updated_action" },
    "team.deleted": { icon: Trash2, key: "team_deleted_action" },
    "member.invited": { icon: MailPlus, key: "member_invited_action" },
    "member.joined": { icon: PartyPopper, key: "member_joined_action" },
    "member.role_changed": { icon: ArrowLeftRight, key: "role_changed_action" },
    "member.removed": { icon: UserX, key: "member_removed_action" },
    "member.left": { icon: LogOut, key: "member_left_action" },
    "invite.revoked": { icon: XCircle, key: "invite_revoked_action" },
  };
  const match = map[action];
  if (!match) {
    return action;
  }
  const Icon = match.icon;
  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      <Icon className="shrink-0 text-gray-400 dark:text-slate-500" size={14} />
      <span>{t(match.key)}</span>
    </span>
  );
}

function timeAgo(timestamp: number, t: ReturnType<typeof useTranslation>["t"]): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) {
    return t("just_now");
  }
  if (mins < 60) {
    return `${mins}m ago`;
  }
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) {
    return `${hrs}h ago`;
  }
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

import CreateTeamModal from "../components/CreateTeamModal";
import DeleteTeamModal from "../components/DeleteTeamModal";
import { Switch } from "../components/ui/Switch";

// ─── Main Team Page ──────────────────────────────────
const TeamPage = () => {
  const { t } = useTranslation();
  const { activeTeamId, teams, currentRole, setActiveTeamId } = useTeam();

  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<
    "members" | "invites" | "auditLog" | "settings"
  >("members");
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [createTeamModalOpen, setCreateTeamModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // ── Queries ──
  const members = useQuery(
    api.teamMembers.list,
    activeTeamId ? { teamId: activeTeamId } : "skip"
  );
  const invites = useQuery(
    api.teamInvites.listByTeam,
    activeTeamId ? { teamId: activeTeamId } : "skip"
  );
  const auditLogs = useQuery(
    api.teamAuditLogs.list,
    activeTeamId ? { teamId: activeTeamId } : "skip"
  );

  // ── Mutations ──
  const updateRole = useMutation(api.teamMembers.updateRole);
  const removeMember = useMutation(api.teamMembers.remove);
  const revokeInvite = useMutation(api.teamInvites.revoke);
  const deleteTeam = useMutation(api.teams.remove);

  const isAdmin = currentRole === "admin" || currentRole === "owner";
  const isOwner = currentRole === "owner";
  const activeTeam = teams.find((t) => t._id === activeTeamId);

  const tabs = [
    { key: "members" as const, label: t("members"), icon: UsersRound },
    { key: "invites" as const, label: t("invites"), icon: Mail },
    { key: "auditLog" as const, label: t("auditLog"), icon: History },
    {
      key: "settings" as const,
      label: t("settings"),
      icon: Shield,
    }, // Reuse Shield or use Settings icon
  ];

  // ─── Team Settings Mutation ───
  const updateTeam = useMutation(api.teams.update);

  // ── No team selected / empty ──
  if (!activeTeamId || teams.length === 0) {
    return (
      <div className="mx-auto max-w-[1600px] p-6 md:ms-32">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/20">
              <UsersRound
                className="text-violet-600 dark:text-violet-400"
                size={36}
              />
            </div>
            <h2 className="mb-2 font-bold text-2xl text-gray-900 dark:text-slate-100">
              {t("noTeamsYet")}
            </h2>
            <p className="mb-8 text-gray-500 text-sm dark:text-slate-400">
              {t("createYourFirstTeam")}
            </p>
            <button
              className="rounded-full bg-gray-900 px-6 py-2 font-bold text-white shadow-gray-900/20 shadow-lg transition-all hover:bg-gray-800 dark:bg-indigo-600 dark:shadow-indigo-600/20 dark:hover:bg-indigo-500"
              onClick={() => setCreateTeamModalOpen(true)}
            >
              {t("createTeam")}
            </button>
          </div>
        </div>
        <CreateTeamModal
          isOpen={createTeamModalOpen}
          onClose={() => setCreateTeamModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] p-6 pb-28 md:ms-32 md:pb-6">
      {/* ── Header ── */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="mb-2 font-bold text-3xl text-gray-900 md:text-4xl dark:text-white">
            {activeTeam?.name ?? t("team")}
          </h1>
          <p className="text-gray-500 text-sm dark:text-slate-400">
            {t("teamSettings")} · {members?.length ?? 0} {t("members")}
          </p>
        </div>

        <button
          className="flex items-center gap-2 self-start rounded-xl border border-gray-200 px-4 py-2 font-bold text-gray-600 text-sm transition-colors hover:bg-gray-50 sm:self-auto dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          onClick={() => setCreateTeamModalOpen(true)}
        >
          <Plus size={16} />
          {t("createTeam")}
        </button>
      </div>

      <CreateTeamModal
        isOpen={createTeamModalOpen}
        onClose={() => setCreateTeamModalOpen(false)}
      />

      {/* ── Your Teams List ── */}
      <div className="mb-8">
        <h3 className="mb-4 font-bold text-gray-400 text-xs uppercase tracking-wider dark:text-slate-500">
          {t("yourTeams")}
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => {
            const isActive = team._id === activeTeamId;
            const initials = team.name
              .split(" ")
              .map((w: string) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <div
                className={`flex items-center gap-4 rounded-2xl border p-4 transition-all ${
                  isActive
                    ? "border-pink-200 bg-white shadow-sm ring-1 ring-pink-100 dark:border-indigo-500/50 dark:bg-slate-800 dark:ring-indigo-500/20"
                    : "border-gray-100 bg-white/50 hover:border-pink-100 hover:bg-white dark:border-slate-700 dark:bg-slate-800/30 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                }`}
                key={team._id}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-sm ${
                    isActive
                      ? "bg-[#FF85A1] text-white shadow-md shadow-pink-500/20"
                      : "bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400"
                  }`}
                >
                  {initials}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-slate-900 dark:text-slate-100">
                    {team.name}
                  </p>
                  <p className="text-gray-500 text-xs capitalize dark:text-slate-500">
                    {t(team.role)}
                  </p>
                </div>

                {!isActive && (
                  <button
                    className="rounded-lg bg-pink-50 px-3 py-1.5 font-bold text-[#FF85A1] text-xs transition-colors hover:bg-[#FF85A1] hover:text-white dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-600 dark:hover:text-white"
                    onClick={() => setActiveTeamId(team._id)}
                  >
                    {t("switch")}
                  </button>
                )}
                {isActive && (
                  <div className="rounded-lg bg-green-50 px-3 py-1.5 font-bold text-green-600 text-xs dark:bg-green-900/20 dark:text-green-400">
                    {t("active")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="mb-8 flex max-w-md rounded-[1.5rem] bg-gray-50 p-1.5 dark:bg-[#1e293b]">
        {tabs.map((tab) => (
          <button
            className={`flex flex-1 items-center justify-center gap-2 rounded-[1.2rem] px-4 py-3 font-semibold text-sm transition-all duration-200 ${
              activeTab === tab.key
                ? "bg-white text-gray-900 shadow-md dark:bg-slate-700 dark:text-white"
                : "text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-300"
            }`}
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
          >
            <tab.icon size={16} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <AnimatePresence mode="wait">
        {/* ─── Members Tab ─── */}
        {activeTab === "members" && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col"
            exit={{ opacity: 0, y: -10 }}
            initial={{ opacity: 0, y: 10 }}
            key="members"
            transition={{ duration: 0.2 }}
          >
            <div className="overflow-hidden rounded-[2.5rem] border border-gray-100/50 bg-white shadow-sm dark:border-slate-700 dark:bg-[#1e293b]">
              {/* Section header */}
              <div className="flex items-center justify-between p-8 pb-4">
                <h3 className="font-bold text-gray-400 text-xs uppercase tracking-wider dark:text-slate-500">
                  {t("members")} ({members?.length ?? 0})
                </h3>
                {isAdmin && (
                  <button
                    className="flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 font-bold text-white text-xs shadow-gray-900/20 shadow-lg transition-all hover:bg-gray-800 active:scale-95 dark:bg-indigo-600 dark:shadow-indigo-600/30 dark:hover:bg-indigo-500"
                    onClick={() => setInviteModalOpen(true)}
                  >
                    <Plus size={14} />
                    {t("inviteMember")}
                  </button>
                )}
              </div>

              {/* Member list */}
              <div className="space-y-3 px-8 pb-8">
                {members?.map((member) => (
                  <div
                    className="flex items-center gap-4 rounded-[1.5rem] bg-gray-50 p-4 transition-colors hover:bg-gray-100 dark:bg-slate-800/50 dark:hover:bg-slate-800"
                    key={member._id}
                  >
                    {/* Avatar */}
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-100 font-bold text-sm text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                      {member.userAvatarUrl ? (
                        <img
                          alt={member.userName}
                          className="h-full w-full object-cover"
                          src={member.userAvatarUrl}
                        />
                      ) : (
                        member.userName
                          .split(" ")
                          .map((w: string) => w[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-gray-900 text-sm dark:text-slate-100">
                        {member.userName}
                      </p>
                      <p className="truncate text-gray-400 text-xs dark:text-slate-500">
                        {member.userEmail}
                      </p>
                    </div>

                    {/* Role badge */}
                    <RoleBadge role={member.role} t={t} />

                    {/* Actions menu (admin+ only, not on self/owner) */}
                    {isAdmin && member.role !== "owner" && (
                      <div className="relative">
                        <button
                          className="rounded-lg p-2 transition-colors hover:bg-gray-200 dark:hover:bg-slate-700"
                          onClick={() =>
                            setOpenMenuId(
                              openMenuId === member._id ? null : member._id
                            )
                          }
                        >
                          <MoreHorizontal
                            className="text-gray-400 dark:text-slate-500"
                            size={16}
                          />
                        </button>
                        <AnimatePresence>
                          {openMenuId === member._id && (
                            <motion.div
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              className="absolute end-0 top-10 z-30 w-48 rounded-xl border border-gray-100 bg-white/95 p-1.5 shadow-xl backdrop-blur-md dark:border-slate-700 dark:bg-[#0f172a]/95"
                              exit={{ opacity: 0, scale: 0.95, y: 5 }}
                              initial={{ opacity: 0, scale: 0.95, y: 5 }}
                              transition={{ duration: 0.15 }}
                            >
                              {/* Toggle admin/member */}
                              <button
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-gray-700 text-sm transition-colors hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-800"
                                onClick={async () => {
                                  await updateRole({
                                    memberId: member._id,
                                    newRole:
                                      member.role === "admin"
                                        ? "member"
                                        : "admin",
                                  });
                                  setOpenMenuId(null);
                                }}
                              >
                                <Shield size={14} />
                                {member.role === "admin"
                                  ? `${t("changeRole")} → ${t("member")}`
                                  : `${t("changeRole")} → ${t("admin")}`}
                              </button>

                              {/* Remove member */}
                              {(isOwner || member.role === "member") && (
                                <button
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-red-600 text-sm transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                  onClick={async () => {
                                    await removeMember({
                                      memberId: member._id,
                                    });
                                    setOpenMenuId(null);
                                    toast.info(
                                      `${t("removeMember")} - ${member.userName}`
                                    );
                                  }}
                                >
                                  <UserMinus size={14} />
                                  {t("removeMember")}
                                </button>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                ))}

                {members?.length === 0 && (
                  <p className="py-8 text-center text-gray-400 text-sm dark:text-slate-500">
                    {t("no_members_yet")}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── Invites Tab ─── */}
        {activeTab === "invites" && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col"
            exit={{ opacity: 0, y: -10 }}
            initial={{ opacity: 0, y: 10 }}
            key="invites"
            transition={{ duration: 0.2 }}
          >
            <div className="overflow-hidden rounded-[2.5rem] border border-gray-100/50 bg-white shadow-sm dark:border-slate-700 dark:bg-[#1e293b]">
              {/* Section header */}
              <div className="flex items-center justify-between p-8 pb-4">
                <h3 className="font-bold text-gray-400 text-xs uppercase tracking-wider dark:text-slate-500">
                  {t("invites")} ({invites?.length ?? 0})
                </h3>
                {isAdmin && (
                  <button
                    className="flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 font-bold text-white text-xs shadow-gray-900/20 shadow-lg transition-all hover:bg-gray-800 active:scale-95 dark:bg-indigo-600 dark:shadow-indigo-600/30 dark:hover:bg-indigo-500"
                    onClick={() => setInviteModalOpen(true)}
                  >
                    <Plus size={14} />
                    {t("inviteMember")}
                  </button>
                )}
              </div>

              {/* Invite list */}
              <div className="space-y-3 px-8 pb-8">
                {invites?.map((invite) => (
                  <div
                    className="flex items-center gap-4 rounded-[1.5rem] bg-gray-50 p-4 dark:bg-slate-800/50"
                    key={invite._id}
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                      <Mail
                        className="text-blue-600 dark:text-blue-400"
                        size={18}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-gray-900 text-sm dark:text-slate-100">
                        {invite.email}
                      </p>
                      <p className="text-gray-400 text-xs dark:text-slate-500">
                        {t("selectRole")}: {t(invite.role)} ·{" "}
                        {timeAgo(invite.createdAt, t)}
                      </p>
                    </div>

                    <InviteStatusBadge status={invite.status} t={t} />
                    <RoleBadge role={invite.role} t={t} />

                    {/* Revoke button for pending invites */}
                    {invite.status === "pending" && isAdmin && (
                      <button
                        className="rounded-lg bg-red-50 px-3 py-1.5 font-bold text-red-600 text-xs transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                        onClick={async () => {
                          await revokeInvite({ inviteId: invite._id });
                          toast(`${t("revokeInvite")} - ${invite.email}`);
                        }}
                      >
                        {t("revokeInvite")}
                      </button>
                    )}
                  </div>
                ))}

                {invites?.length === 0 && (
                  <div className="py-12 text-center">
                    <Mail
                      className="mx-auto mb-3 text-gray-300 dark:text-slate-600"
                      size={32}
                    />
                    <p className="text-gray-400 text-sm dark:text-slate-500">
                      {t("no_invites_yet")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── Audit Log Tab ─── */}
        {activeTab === "auditLog" && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col"
            exit={{ opacity: 0, y: -10 }}
            initial={{ opacity: 0, y: 10 }}
            key="auditLog"
            transition={{ duration: 0.2 }}
          >
            <div className="overflow-hidden rounded-[2.5rem] border border-gray-100/50 bg-white shadow-sm dark:border-slate-700 dark:bg-[#1e293b]">
              <div className="p-8 pb-4">
                <h3 className="font-bold text-gray-400 text-xs uppercase tracking-wider dark:text-slate-500">
                  {t("auditLog")} ({auditLogs?.length ?? 0})
                </h3>
              </div>

              <div className="px-8 pb-8">
                <div className="space-y-0">
                  {auditLogs?.map((log, i: number) => (
                    <div
                      className="flex gap-4 border-gray-100 border-b py-4 last:border-0 dark:border-slate-700/50"
                      key={log._id}
                    >
                      {/* Timeline dot */}
                      <div className="flex flex-col items-center">
                        <div className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-violet-400 dark:bg-violet-500" />
                        {i < (auditLogs?.length ?? 0) - 1 && (
                          <div className="mt-1 w-px flex-1 bg-gray-200 dark:bg-slate-700" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1 pb-2">
                        <p className="font-bold text-gray-900 text-sm dark:text-slate-100">
                          {formatAction(log.action, t)}
                        </p>
                        <p className="mt-0.5 text-gray-500 text-xs dark:text-slate-400">
                          {log.actorName}
                          {log.targetLabel && (
                            <span className="text-gray-400 dark:text-slate-500">
                              {" "}
                              → {log.targetLabel}
                            </span>
                          )}
                        </p>
                        {/* Meta details */}
                        {log.meta &&
                          typeof log.meta === "object" &&
                          log.meta.oldRole && (
                            <p className="mt-1 font-mono text-[10px] text-gray-400 dark:text-slate-600">
                              {log.meta.oldRole} → {log.meta.newRole}
                            </p>
                          )}
                        <p className="mt-1 text-[10px] text-gray-400 dark:text-slate-600">
                          {timeAgo(log.createdAt, t)}
                        </p>
                      </div>
                    </div>
                  ))}

                  {auditLogs?.length === 0 && (
                    <div className="py-12 text-center">
                      <History
                        className="mx-auto mb-3 text-gray-300 dark:text-slate-600"
                        size={32}
                      />
                      <p className="text-gray-400 text-sm dark:text-slate-500">
                        {t("no_activity_yet")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── Settings Tab ─── */}
        {activeTab === "settings" && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col"
            exit={{ opacity: 0, y: -10 }}
            initial={{ opacity: 0, y: 10 }}
            key="settings"
            transition={{ duration: 0.2 }}
          >
            <div className="overflow-hidden rounded-[2.5rem] border border-gray-100/50 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-[#1e293b]">
              <h3 className="mb-6 font-bold text-gray-400 text-xs uppercase tracking-wider dark:text-slate-500">
                {t("teamSettings")}
              </h3>

              <div className="flex flex-col justify-between gap-4 rounded-[1.5rem] bg-gray-50 p-6 sm:flex-row sm:items-center dark:bg-slate-800/50">
                <div>
                  <h4 className="flex items-center gap-2 font-bold text-gray-900 text-lg dark:text-slate-100">
                    <History className="text-purple-500" size={18} />

                    {t("auto_version_numbering")}
                  </h4>
                  <p className="mt-1 max-w-lg text-gray-500 text-sm dark:text-slate-400">
                    {t("automatically_increment_project_version_")}
                  </p>
                </div>

                <Switch
                  checked={activeTeam?.autoVersioning ?? false}
                  disabled={!isAdmin}
                  onChange={async (val) => {
                    if (!activeTeamId) {
                      return;
                    }
                    try {
                      await updateTeam({
                        id: activeTeamId,
                        autoVersioning: val,
                      });
                      toast.success(t("settings_updated"));
                    } catch (err) {
                      toast.error(t("failed_to_update_settings"));
                    }
                  }}
                  size="lg"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Danger zone (owner only) ── */}
      {isOwner && (
        <div className="mt-8 rounded-[2.5rem] border border-red-200/50 bg-white p-8 shadow-sm dark:border-red-900/30 dark:bg-[#1e293b]">
          <h3 className="mb-4 font-bold text-red-400 text-xs uppercase tracking-wider dark:text-red-500">
            {t("danger_zone")}
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-900 text-sm dark:text-slate-100">
                {t("deleteTeam")}
              </p>
              <p className="mt-0.5 text-gray-400 text-xs dark:text-slate-500">
                {t("this_will_permanently_delete_the_team_an")}
              </p>
            </div>
            <button
              className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 font-bold text-red-600 text-xs transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
              onClick={() => setDeleteModalOpen(true)}
            >
              <Trash2 size={14} />
              {t("deleteTeam")}
            </button>
          </div>
        </div>
      )}

      {/* Invite modal */}
      <InviteMemberModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
      />

      <DeleteTeamModal
        isDeleting={isDeleting}
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={async () => {
          if (!activeTeamId) {
            return;
          }
          setIsDeleting(true);

          const teamIdToDelete = activeTeamId;
          // Calculate next team to switch to (if any)
          const remainingTeams = teams.filter((t) => t._id !== teamIdToDelete);
          const nextTeam = remainingTeams.length > 0 ? remainingTeams[0] : null;

          try {
            // Switch context BEFORE deleting so queries immediately skip the stale team
            if (activeTeamId === teamIdToDelete) {
              setActiveTeamId(nextTeam ? nextTeam._id : null);
            }

            await deleteTeam({ id: teamIdToDelete });

            toast.success(t("deleteTeamSuccess"));
            setDeleteModalOpen(false);
          } catch (error) {
            console.error(error);
            toast.error(t("deleteTeamError"));
          } finally {
            setIsDeleting(false);
          }
        }}
        teamName={activeTeam?.name}
      />
    </div>
  );
};

export default TeamPage;
