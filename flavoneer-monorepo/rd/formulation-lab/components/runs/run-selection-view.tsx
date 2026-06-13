import { AnimatePresence, type HTMLMotionProps, motion } from "framer-motion";
import { Eye, FileText, History, Loader2, Play } from "lucide-react";
import type React from "react";
import { useTranslation } from "react-i18next";
import { modalVariants, overlayVariants } from "../../lib/animations";
import type { EnrichedProject, RunRecord } from "../../types";
import InfiniteScrollObserver from "../InfiniteScrollObserver";

const MotionDiv = motion.div as React.FC<
  HTMLMotionProps<"div"> & {
    className?: string;
    children?: React.ReactNode;
  }
>;

interface ProfileSignature {
  signatureData?: string | null;
  signatureFont?: string | null;
}

interface RunSelectionViewProps {
  currentUserId?: string;
  isAuthorized: boolean;
  isStartingRun: boolean;
  loadMoreProjects: (numItems: number) => void;
  onStartRun: (projectId: string, projectName: string) => void;
  onViewRun: (runId: string) => void;
  profile?: ProfileSignature | null;
  projects: EnrichedProject[];
  projectsStatus: string;
  runsHistory: RunRecord[];
  setSignatures: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  signatures: Record<string, string>;
}

const getLatestVersionsMap = (projects: EnrichedProject[]) => {
  const latestVersionsMap = new Map<string, string>();

  for (const project of projects) {
    const previousVersion = latestVersionsMap.get(project.name);
    if (
      !previousVersion ||
      project.version.localeCompare(previousVersion, undefined, {
        numeric: true,
      }) > 0
    ) {
      latestVersionsMap.set(project.name, project.version);
    }
  }

  return latestVersionsMap;
};

const RunSelectionView: React.FC<RunSelectionViewProps> = ({
  projects,
  projectsStatus,
  loadMoreProjects,
  runsHistory,
  profile,
  signatures,
  setSignatures,
  currentUserId,
  isAuthorized,
  isStartingRun,
  onStartRun,
  onViewRun,
}) => {
  const { t } = useTranslation();
  const latestVersionsMap = getLatestVersionsMap(projects);

  return (
    <div
      className="mx-auto max-w-7xl space-y-8 p-6"
      data-testid="run-selection-view"
    >
      <div className="flex items-end justify-between">
        <div>
          <h1 className="mb-2 font-extrabold text-3xl text-gray-900 tracking-tight dark:text-white">
            {t("run_lab_batch")}
          </h1>
          <p className="text-gray-500 dark:text-slate-400">
            {t("select_a_project_to_start_a_new_experime")}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 font-bold text-gray-600 text-sm hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            type="button"
          >
            <History size={16} /> {t("run_history")}
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[2rem] border-2 border-gray-200 border-dashed bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 text-gray-400 dark:bg-slate-700/50">
            <FileText size={32} />
          </div>
          <h3 className="mb-2 font-bold text-gray-900 text-xl dark:text-white">
            {t("no_published_formulations")}
          </h3>
          <p className="max-w-sm text-gray-500 text-sm">
            {t("there_are_currently_no_released_formulat")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const isLatest =
              latestVersionsMap.get(project.name) === project.version;
            const isOutdated = !isLatest;
            const isDraft = project.status !== "Released";
            const isUnauthorizedExecutor =
              project.authorizedExecutor &&
              project.authorizedExecutor !== currentUserId;
            const hasExecutePermission =
              isAuthorized && !isUnauthorizedExecutor;
            const isDisabled =
              !hasExecutePermission ||
              isDraft ||
              isOutdated ||
              !(profile?.signatureData || signatures[project._id]);

            let tooltipMsg = "";
            if (!isAuthorized) {
              tooltipMsg = t("requires_execution_rights");
            } else if (isUnauthorizedExecutor) {
              tooltipMsg = t("unauthorized_access");
            } else if (isDraft) {
              tooltipMsg = t("non_released_run_error");
            } else if (isOutdated) {
              tooltipMsg = t("newer_version_available", {
                version: latestVersionsMap.get(project.name),
              });
            }

            return (
              <div
                className="group relative flex flex-col justify-between overflow-hidden rounded-[2rem] border-2 border-transparent bg-white p-6 shadow-sm transition-all duration-300 hover:border-blue-500 hover:shadow-xl dark:bg-slate-800"
                data-testid="run-project-card"
                key={project._id}
              >
                <div>
                  <div className="absolute end-0 top-0 translate-x-2 transform p-6 opacity-0 transition-opacity group-hover:translate-x-0 group-hover:opacity-100">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg">
                      <Play fill="currentColor" size={20} />
                    </div>
                  </div>

                  <div className="mb-4">
                    <span className="rounded-full bg-blue-50 px-3 py-1 font-bold text-blue-600 text-xs uppercase tracking-wider dark:bg-blue-900/30 dark:text-blue-400">
                      {project.version}
                    </span>
                  </div>

                  <h3 className="mb-2 font-bold text-gray-900 text-xl leading-tight dark:text-white">
                    {project.name}
                  </h3>
                  <p className="mb-6 line-clamp-2 text-gray-500 text-sm dark:text-slate-400">
                    {project.description}
                  </p>

                  <div className="mb-4 flex items-center gap-4 border-gray-100 border-t pt-4 dark:border-slate-700">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map((item) => (
                        <div
                          className="h-8 w-8 rounded-full bg-gray-200 ring-2 ring-white dark:ring-slate-800"
                          key={item}
                        />
                      ))}
                    </div>
                    <span className="font-bold text-gray-400 text-xs">
                      {project.ingredients?.length || 0} {t("ingredients")}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 border-gray-100 border-t pt-4 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    {profile?.signatureData ? (
                      <div className="flex flex-1 items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 dark:border-blue-900/50 dark:bg-blue-900/20">
                        <span className="font-medium text-blue-700 text-sm dark:text-blue-300">
                          {t("auto_signed_identity")}
                        </span>
                        <span
                          className="text-blue-900 text-lg dark:text-blue-100"
                          style={{
                            fontFamily: profile.signatureFont || "inherit",
                          }}
                        >
                          {profile.signatureData}
                        </span>
                      </div>
                    ) : (
                      <input
                        className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900/50 dark:text-white"
                        data-testid="run-signature-input"
                        disabled={!hasExecutePermission}
                        onChange={(event) =>
                          setSignatures((prev) => ({
                            ...prev,
                            [project._id]: event.target.value,
                          }))
                        }
                        placeholder={
                          hasExecutePermission
                            ? t("sign_off_signature")
                            : t("unauthorized")
                        }
                        type="text"
                        value={signatures[project._id] || ""}
                      />
                    )}
                  </div>
                  <div className="group/btn relative w-full">
                    <button
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-bold text-white shadow-blue-500/20 shadow-lg transition-all hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:dark:bg-slate-700"
                      data-testid="run-procedure-button"
                      disabled={isDisabled}
                      onClick={() => onStartRun(project._id, project.name)}
                      type="button"
                    >
                      <Play fill="currentColor" size={16} />{" "}
                      {t("run_procedure")}
                    </button>
                    {isDisabled && tooltipMsg && (
                      <div className="pointer-events-none absolute start-1/2 bottom-full z-10 mb-2 -translate-x-1/2 scale-95 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 font-bold text-white text-xs opacity-0 shadow-xl transition-all duration-200 group-hover/btn:scale-100 group-hover/btn:opacity-100 dark:bg-slate-800">
                        {tooltipMsg}
                        <div className="absolute start-1/2 top-full -mt-1 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-slate-800" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <InfiniteScrollObserver
        canLoadMore={projectsStatus === "CanLoadMore"}
        isLoading={projectsStatus === "LoadingMore"}
        onLoadMore={() => loadMoreProjects(50)}
      />

      <div className="mt-8 md:col-span-2 lg:col-span-3">
        <h3 className="mb-4 font-bold text-lg">{t("recent_runs")}</h3>
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-slate-700 dark:bg-slate-800">
          {runsHistory.slice(0, 3).map((run) => (
            <div
              className="flex items-center justify-between border-gray-100 border-b p-4 transition-colors last:border-0 hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-700/50"
              key={run.id}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600 dark:bg-green-900/20">
                  <FileText size={20} />
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">
                    {run.projectName}
                  </p>
                  <p className="font-mono text-gray-500 text-xs">
                    {run.batchCode}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-end">
                  <p className="text-gray-400 text-xs">{t("duration")}</p>
                  <p className="font-bold text-sm">
                    {run.durationString || "0m"}
                  </p>
                </div>
                <button
                  className="group-btn cursor-pointer rounded-full p-2 transition-colors hover:bg-gray-200 dark:hover:bg-slate-600"
                  onClick={(event) => {
                    event.stopPropagation();
                    onViewRun(run.id);
                  }}
                  type="button"
                >
                  <Eye
                    className="text-gray-400 group-btn-hover:text-blue-500"
                    size={18}
                  />
                </button>
              </div>
            </div>
          ))}
          {runsHistory.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              {t("no_completed_runs_yet")}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isStartingRun && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <MotionDiv
              animate="visible"
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-md dark:bg-black/80"
              exit="exit"
              initial="hidden"
              variants={overlayVariants}
            />

            <MotionDiv
              animate="visible"
              className="relative z-[1000] flex max-w-sm flex-col items-center rounded-[2.5rem] border border-white/50 bg-white p-10 text-center shadow-2xl dark:border-slate-700 dark:bg-[#0f172a]"
              exit="exit"
              initial="hidden"
              variants={modalVariants}
            >
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="mb-2 font-black text-2xl text-gray-900 dark:text-white">
                {t("initializing_batch")}
              </h3>
              <p className="font-medium text-gray-500 text-sm dark:text-slate-400">
                {t("loading_formulation_and_cloning_phases")}
              </p>
            </MotionDiv>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RunSelectionView;
