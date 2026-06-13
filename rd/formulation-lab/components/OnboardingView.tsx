import { useMutation } from "convex/react";
import { type HTMLMotionProps, motion } from "framer-motion";
import { useTranslation } from "react-i18next";

const MotionDiv = motion.div as React.FC<
  HTMLMotionProps<"div"> & { className?: string; children?: React.ReactNode }
>;

import { Beaker, FlaskConical, Loader2, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { useTeam } from "../context/TeamContext";
import { api } from "../convex/_generated/api";
import { useToast } from "../hooks/useToast";

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export default function OnboardingView() {
  const { t } = useTranslation();
  const [newTeamName, setNewTeamName] = useState("");
  const { toast } = useToast();
  const [inviteToken, setInviteToken] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const { setActiveTeamId } = useTeam();
  const createTeam = useMutation(api.teams.create);
  const joinTeam = useMutation(api.teamInvites.accept);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) {
      return;
    }
    setIsCreating(true);
    try {
      const teamId = await createTeam({ name: newTeamName.trim() });
      setActiveTeamId(teamId);
      toast.success(t("teamCreated"));
    } catch (err) {
      toast.error(getErrorMessage(err, t("failed_to_create_team")));
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteToken.trim()) {
      return;
    }
    setIsJoining(true);
    try {
      const teamId = await joinTeam({ token: inviteToken.trim() });
      setActiveTeamId(teamId);
      toast.success(t("joined_team_success"));
    } catch (err) {
      toast.error(getErrorMessage(err, t("invalid_invite_token")));
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] w-full flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <MotionDiv
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-16 text-center"
        initial={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.6 }}
      >
        <div className="pointer-events-none absolute start-1/2 -top-12 -z-10 -translate-x-1/2 opacity-5 dark:opacity-10">
          <Beaker size={200} />
        </div>
        <h1 className="mb-4 font-extrabold text-4xl text-charcoal tracking-tight sm:text-5xl dark:text-white">
          {t("welcome_to")}{" "}
          <span className="text-indigo-600 dark:text-indigo-400">
            {t("mesqey")}
          </span>
        </h1>
        <p className="mx-auto max-w-2xl text-gray-500 text-lg sm:text-xl dark:text-slate-400">
          {t("your_centralized_operating_system_for_la")}
        </p>
      </MotionDiv>

      {/* Action Cards */}
      <div className="z-10 grid w-full max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
        {/* Create Team Card */}
        <MotionDiv
          animate={{ opacity: 1, x: 0 }}
          className="group relative flex flex-col overflow-hidden rounded-[2rem] border border-gray-100 bg-white p-8 shadow-2xl backdrop-blur-3xl dark:border-slate-700/50 dark:bg-slate-800/80"
          initial={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="pointer-events-none absolute end-0 top-0 p-6 text-gray-100 transition-transform duration-500 group-hover:scale-110 dark:text-slate-700/30">
            <FlaskConical size={120} />
          </div>
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
            <Users size={28} />
          </div>
          <h3 className="relative z-10 mb-2 font-bold text-2xl text-gray-900 dark:text-white">
            {t("create_a_team")}
          </h3>
          <p className="relative z-10 mb-8 flex-1 text-gray-500 dark:text-slate-400">
            {t("establish_your_own_laboratory_workspace_")}
          </p>
          <form
            className="relative z-10 flex flex-col gap-3 sm:flex-row"
            onSubmit={handleCreateTeam}
          >
            <input
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-medium text-gray-900 placeholder-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:border-slate-700 dark:bg-slate-900/50 dark:text-white dark:placeholder-slate-500"
              data-testid="create-team-name-input"
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder={t("example_workspace")}
              type="text"
              value={newTeamName}
            />
            <button
              className="flex shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white transition-colors hover:bg-indigo-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-32"
              data-testid="create-team-submit-button"
              disabled={!newTeamName.trim() || isCreating}
              type="submit"
            >
              {isCreating ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                "Create"
              )}
            </button>
          </form>
        </MotionDiv>

        {/* Join Team Card */}
        <MotionDiv
          animate={{ opacity: 1, x: 0 }}
          className="group relative flex flex-col overflow-hidden rounded-[2rem] border border-gray-100 bg-white p-8 shadow-2xl backdrop-blur-3xl dark:border-slate-700/50 dark:bg-slate-800/80"
          initial={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="pointer-events-none absolute end-0 top-0 p-6 text-gray-100 transition-transform duration-500 group-hover:scale-110 dark:text-slate-700/30">
            <UserPlus size={120} />
          </div>
          <div className="relative z-10 mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
            <UserPlus size={28} />
          </div>
          <h3 className="relative z-10 mb-2 font-bold text-2xl text-gray-900 dark:text-white">
            {t("join_a_team")}
          </h3>
          <p className="relative z-10 mb-8 flex-1 text-gray-500 dark:text-slate-400">
            {t("have_an_invite_code_enter_it_below_to_se")}
          </p>
          <form
            className="relative z-10 flex flex-col gap-3 sm:flex-row"
            onSubmit={handleJoinTeam}
          >
            <input
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-medium text-gray-900 placeholder-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:border-slate-700 dark:bg-slate-900/50 dark:text-white dark:placeholder-slate-500"
              onChange={(e) => setInviteToken(e.target.value)}
              placeholder={t("paste_invite_token")}
              type="text"
              value={inviteToken}
            />
            <button
              className="flex shrink-0 items-center justify-center rounded-xl bg-gray-900 px-6 py-3 font-bold text-white shadow-lg transition-colors hover:bg-black active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-32 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              disabled={!inviteToken.trim() || isJoining}
              type="submit"
            >
              {isJoining ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                "Join"
              )}
            </button>
          </form>
        </MotionDiv>
      </div>
    </div>
  );
}
