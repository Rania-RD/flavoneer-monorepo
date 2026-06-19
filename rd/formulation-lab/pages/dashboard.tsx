import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { AnimatePresence, type HTMLMotionProps, motion } from "framer-motion";
import { Loader2, Plus, Search } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import InfiniteScrollObserver from "../components/InfiniteScrollObserver";
import NewProjectModal from "../components/NewProjectModal";
import OnboardingView from "../components/OnboardingView";
import ProfileHeader from "../components/ProfileHeader";
import ProjectCard from "../components/ProjectCard";
import ProjectDetailsModal from "../components/ProjectDetailsModal";
import { useSettings } from "../context/SettingsContext";
import { useTeam } from "../context/TeamContext";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { modalVariants, overlayVariants } from "../lib/animations";
import { authClient } from "../lib/auth-client";
import type { EnrichedProject } from "../types";

const MotionDiv = motion.div as React.FC<
  HTMLMotionProps<"div"> & { className?: string; children?: React.ReactNode }
>;

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { language } = useSettings();

  const [filter, setFilter] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] =
    useState<EnrichedProject | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isStartingRun, setIsStartingRun] = useState(false);
  const navigate = useNavigate();

  // Team context
  const { activeTeamId, teams, teamsLoading } = useTeam();

  const { data: session } = authClient.useSession();

  const {
    results: projectsRaw,
    status: projectsStatus,
    loadMore: loadMoreProjects,
  } = usePaginatedQuery(
    api.projects.listByTeam,
    activeTeamId ? { teamId: activeTeamId, language } : { language },
    { initialNumItems: 50 }
  );
  const teamMembersRaw = useQuery(
    api.teamMembers.list,
    activeTeamId ? { teamId: activeTeamId } : "skip"
  );
  const createProject = useMutation(api.projects.create);
  const updateProject = useMutation(api.projects.update);
  const removeProject = useMutation(api.projects.remove);
  const createNewVersion = useMutation(api.projects.createNewVersion);
  const createNewRun = useMutation(api.runs.createNewRun);
  const logActivity = useMutation(api.activities.log);

  const projects: EnrichedProject[] =
    (projectsRaw as unknown as EnrichedProject[]) ?? [];
  const teamMembers = teamMembersRaw ?? [];

  const handleOpenDetails = (project: EnrichedProject) => {
    setSelectedProject(project);
    setIsDetailsModalOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDetailsModalOpen(false);
    setTimeout(() => setSelectedProject(null), 200);
  };

  const onAddProject = async (projectData: EnrichedProject) => {
    const { _id, _creationTime, userId, teamId, ...data } = projectData;
    const newProjectId = await createProject({
      ...data,
      teamId: activeTeamId ?? undefined,
      userId: session?.user?.id ?? undefined,
    });
    logActivity({
      action: "Created Project",
      target: data.name,
      page: "Dashboard",
    });
    navigate(`/project/${newProjectId}?tab=formulation`);
  };

  const handleProjectUpdate = async (updated: EnrichedProject) => {
    const { _id, _creationTime, updatedAt, teamId, userId, ...data } = updated;
    await updateProject({
      id: _id,
      ...data,
    });
    logActivity({
      action: "Updated Project",
      target: updated.name,
      page: "Dashboard",
    });

    // Update local selected project immediately for UI responsiveness if needed
    // But since it's real-time, it should update automatically.
    // However, selectedProject is local state, so we update it to reflect changes in the modal
    if (selectedProject?._id === updated._id) {
      setSelectedProject(updated);
    }
  };

  const handleDuplicateProject = async (project: EnrichedProject) => {
    const newProjectId = await createNewVersion({ id: project._id });
    logActivity({
      action: "Created New Draft Version",
      target: project.name,
      page: "Dashboard",
    });
    navigate(`/project/${newProjectId}?tab=formulation`);
  };

  const handleDeleteProject = async (projectId: Id<"projects">) => {
    await removeProject({ id: projectId });
    logActivity({
      action: "Deleted Project",
      target: projectId,
      page: "Dashboard",
    });
  };

  const handleStartRun = async (projectId: Id<"projects">) => {
    setIsStartingRun(true);
    try {
      const runId = await createNewRun({
        formulationId: projectId,
      });
      logActivity({
        action: "Started Lab Batch",
        target: projectId,
        page: "Dashboard",
      });
      // Small delay for smooth animation
      setTimeout(() => {
        navigate(`/run/${runId}`);
      }, 600);
    } catch (e) {
      console.error(e);
      setIsStartingRun(false);
    }
  };

  const filteredProjects = projects.filter((p) => {
    let matchesFilter = true;
    if (filter === "Active") {
      matchesFilter = p.status !== "Approved";
    } else if (filter === "Completed") {
      matchesFilter = p.status === "Approved";
    }
    const matchesSearch = p.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (
    teamsLoading ||
    projectsRaw === undefined ||
    (activeTeamId && teamMembersRaw === undefined)
  ) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8 text-center text-gray-500">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (!activeTeamId && teams.length === 0) {
    return <OnboardingView />;
  }
  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="z-10 order-1 w-full shrink-0 space-y-4 lg:sticky lg:top-4 lg:order-1 lg:w-72 lg:self-start xl:w-80">
        <ProfileHeader />
      </div>

      <div className="order-2 min-w-0 flex-1 space-y-4 lg:order-2">
        <div className="enterprise-toolbar flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="text-start">
            <h1 className="whitespace-pre-line font-semibold text-2xl text-slate-950 tracking-tight md:text-3xl dark:text-slate-100">
              {t("investInnovation")}
            </h1>
            <div className="mt-3 flex h-auto flex-wrap gap-1">
              {[
                { key: "All", label: t("all") },
                { key: "Active", label: t("active") },
                { key: "Completed", label: t("completed") },
              ].map((item) => (
                <button
                  className={`whitespace-nowrap border px-3 py-1.5 font-semibold text-xs uppercase tracking-wide transition-colors ${
                    filter === item.key
                      ? "border-slate-950 bg-slate-950 text-white dark:border-sky-600 dark:bg-sky-600"
                      : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                  key={item.key}
                  onClick={() => setFilter(item.key)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex w-full items-center gap-2 md:w-auto">
            <div className="group relative flex-1 md:flex-none">
              <Search
                className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-slate-700 dark:text-slate-500 dark:group-focus-within:text-slate-200"
                size={16}
              />
              <input
                className="enterprise-input w-full ps-9 md:w-64"
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t("search")}
                type="text"
                value={searchTerm}
              />
            </div>
            <button
              className="enterprise-button-primary h-10 w-10 shrink-0 p-0"
              data-testid="new-project-button"
              onClick={() => setIsModalOpen(true)}
              title={t("newProject")}
              type="button"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        <div className="relative z-0 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project._id}
              onDelete={handleDeleteProject}
              onDuplicate={handleDuplicateProject}
              onStartRun={handleStartRun}
              onViewDetails={handleOpenDetails}
              project={project}
              teamMembers={teamMembers}
            />
          ))}

          <button
            className="enterprise-panel-muted group flex min-h-[220px] w-full flex-col items-center justify-center gap-3 border-dashed text-slate-500 transition-colors hover:border-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-900"
            data-testid="new-project-button"
            onClick={() => setIsModalOpen(true)}
            type="button"
          >
            <div className="border border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-950">
              <Plus size={20} />
            </div>
            <span className="font-semibold text-sm">{t("newProject")}</span>
          </button>
        </div>

        <InfiniteScrollObserver
          canLoadMore={projectsStatus === "CanLoadMore"}
          isLoading={projectsStatus === "LoadingMore"}
          onLoadMore={() => loadMoreProjects(50)}
        />
      </div>

      <NewProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={onAddProject}
        teamMembers={teamMembers}
      />

      <ProjectDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={handleCloseDetails}
        onUpdateProject={handleProjectUpdate}
        project={selectedProject}
        teamMembers={teamMembers}
      />

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
                {t("loading_formulation_and_setting_up_qc_ch")}
              </p>
            </MotionDiv>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
