import { useQuery } from "convex/react";
import { AnimatePresence } from "framer-motion";
import {
  Activity,
  Beaker,
  Droplet,
  Edit3,
  FlaskConical,
  Target,
  Thermometer,
  X,
} from "lucide-react";
import { DateTime } from "luxon";
import type React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { usePermissions } from "../hooks/usePermissions";
import { MotionDiv, modalVariants, overlayVariants } from "../lib/animations";
import type { EnrichedProject } from "../types";
import EditProjectModal from "./EditProjectModal";
import VersionHistoryModal from "./VersionHistoryModal";

interface ProjectDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateProject?: (project: EnrichedProject) => void;
  project: EnrichedProject | null;
  teamMembers?: { userId: string; userName: string; userAvatarUrl?: string }[];
}

const ProjectDetailsModal: React.FC<ProjectDetailsModalProps> = ({
  isOpen,
  onClose,
  project,
  onUpdateProject,
  teamMembers = [],
}) => {
  const { isRTL, language } = useSettings();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { formatTemp } = useSettings();
  const { hasPermission } = usePermissions();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  if (!project) {
    return null;
  }

  const handleEditIngredients = () => {
    navigate(`/project/${project._id}`);
  };

  const handleSaveEdit = (updated: EnrichedProject) => {
    if (onUpdateProject) {
      onUpdateProject(updated);
    }
    // The parent Dashboard handles the state update, which flows back down to 'project' prop here
    setIsEditModalOpen(false);
  };

  // Status Badge Logic to match Soft UI
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300";
      case "Testing":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300";
      case "Prototype":
        return "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300";
      case "Review":
        return "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
    }
  };
  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            dir={isRTL ? "rtl" : "ltr"}
          >
            {/* Backdrop */}
            <MotionDiv
              animate="visible"
              className="absolute inset-0 bg-gray-900/20 backdrop-blur-md dark:bg-black/60"
              exit="exit"
              initial="hidden"
              onClick={onClose}
              variants={overlayVariants}
            />

            {/* Modal Content - Bento Grid Container - Responsive Width */}
            <MotionDiv
              animate="visible"
              className="scrollbar-hide relative max-h-[90vh] w-full overflow-y-auto overflow-x-hidden rounded-[2.5rem] border border-white/50 bg-[#FDFCF6] shadow-2xl md:w-[95%] lg:w-[70%] dark:border-slate-800 dark:bg-[#0f172a]"
              exit="exit"
              initial="hidden"
              variants={modalVariants}
            >
              {/* Floating Close Button */}
              <button
                className="absolute end-6 top-6 z-50 rounded-full bg-white/50 p-2 text-gray-500 backdrop-blur-sm transition-colors hover:bg-white dark:bg-[#1e293b]/50 dark:text-slate-400 dark:hover:bg-[#1e293b]"
                onClick={onClose}
              >
                <X size={24} />
              </button>

              <div className="space-y-6 p-6 md:p-8">
                {/* Header Section */}
                <div className="mb-2 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                  <div>
                    <div className="mb-2 flex items-center gap-3">
                      <span
                        className={`rounded-full px-4 py-1.5 font-bold text-xs uppercase tracking-wider ${getStatusStyle(project.status)}`}
                      >
                        {project.status}
                      </span>
                      <span className="font-medium text-gray-400 text-sm dark:text-slate-500">
                        v{project.version}
                      </span>
                    </div>
                    <h2 className="font-bold text-3xl text-gray-900 tracking-tight md:text-4xl dark:text-slate-100">
                      {project.name}
                    </h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      className="flex items-center gap-2 rounded-[1.5rem] border border-gray-200 bg-white px-6 py-3 font-bold text-gray-600 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      onClick={() => setIsHistoryModalOpen(true)}
                    >
                      <Activity size={18} />

                      {t("history")}
                    </button>
                    {hasPermission("edit_procedures") && (
                      <button
                        className="flex items-center gap-2 rounded-[1.5rem] bg-gray-100 px-6 py-3 font-bold text-gray-900 transition-colors hover:bg-gray-200 dark:bg-[#1e293b] dark:text-slate-100 dark:hover:bg-slate-700"
                        onClick={() => setIsEditModalOpen(true)}
                      >
                        <Edit3 size={18} />

                        {t("edit_meta")}
                      </button>
                    )}
                    <button
                      className="flex items-center gap-2 rounded-[1.5rem] bg-gray-900 px-6 py-3 font-bold text-white shadow-lg transition-transform hover:scale-105 dark:bg-indigo-600"
                      onClick={handleEditIngredients}
                    >
                      <FlaskConical size={18} />

                      {t("formulation")}
                    </button>
                  </div>
                </div>

                {/* BENTO GRID */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {/* 1. Description & Core Info (Col Span 2) */}
                  <div className="group relative col-span-1 overflow-hidden rounded-[2.5rem] border border-gray-100 bg-white p-8 shadow-sm md:col-span-2 dark:border-slate-800 dark:bg-[#1e293b]">
                    <div className="relative z-10">
                      <h3 className="mb-4 font-bold text-gray-900 text-lg dark:text-slate-100">
                        {t("project_overview")}
                      </h3>
                      <p className="mb-6 text-gray-600 text-lg leading-relaxed dark:text-slate-400">
                        {project.description ||
                          "No description provided for this project."}
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <div className="flex items-center gap-2 rounded-2xl bg-gray-50 px-4 py-2 dark:bg-slate-900/50">
                          <span className="font-bold text-gray-400 text-xs uppercase dark:text-slate-500">
                            {t("category")}
                          </span>
                          <span className="font-semibold text-gray-900 dark:text-slate-100">
                            {project.category || "General"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 rounded-2xl bg-gray-50 px-4 py-2 dark:bg-slate-900/50">
                          <span className="font-bold text-gray-400 text-xs uppercase dark:text-slate-500">
                            {t("lead")}
                          </span>
                          <span className="font-semibold text-gray-900 dark:text-slate-100">
                            {project.lead}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Decor */}
                    <div className="absolute end-0 top-0 -me-20 -mt-20 h-64 w-64 rounded-full bg-gray-50 blur-3xl transition-colors group-hover:bg-gray-100 dark:bg-white/5 dark:group-hover:bg-white/10" />
                  </div>

                  {/* 2. Processing Parameters (Col Span 1) */}
                  <div className="flex flex-col justify-between rounded-[2.5rem] border border-sky-100 bg-[#E0F2FE] p-8 dark:border-sky-800/30 dark:bg-sky-900/20">
                    <div>
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/60 text-sky-600 shadow-sm dark:bg-sky-500/20 dark:text-sky-300">
                        <Thermometer size={24} />
                      </div>
                      <h3 className="mb-1 font-bold text-lg text-sky-900 dark:text-sky-100">
                        {t("processing")}
                      </h3>
                      <p className="text-sky-700/70 text-sm dark:text-sky-200/60">
                        {project.processingMethod || "Standard"}
                      </p>
                    </div>
                    <div className="mt-6 space-y-3">
                      <div className="flex items-center justify-between rounded-2xl bg-white/40 p-3 dark:bg-sky-950/40">
                        <span className="font-bold text-sky-800 text-xs uppercase dark:text-sky-200">
                          {t("temp")}
                        </span>
                        <span className="font-bold text-sky-900 text-xl dark:text-slate-100">
                          {project.processingTemp
                            ? formatTemp(project.processingTemp)
                            : "--"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl bg-white/40 p-3 dark:bg-sky-950/40">
                        <span className="font-bold text-sky-800 text-xs uppercase dark:text-sky-200">
                          {t("time")}
                        </span>
                        <span className="font-bold text-sky-900 text-xl dark:text-slate-100">
                          {project.processingTime || "--"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Nutrition & Targets (Col Span 1) */}
                  <div className="rounded-[2.5rem] border border-amber-100 bg-[#FEF3C7] p-8 dark:border-amber-800/30 dark:bg-amber-900/20">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/60 text-amber-600 shadow-sm dark:bg-amber-500/20 dark:text-amber-300">
                      <Activity size={24} />
                    </div>
                    <h3 className="mb-4 font-bold text-amber-900 text-lg dark:text-amber-100">
                      {t("nutritional_goals")}
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <div className="mb-1 flex justify-between font-bold text-amber-800 text-xs dark:text-amber-200">
                          <span>{t("protein_target")}</span>
                          <span>85%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-white/40 dark:bg-amber-950/40">
                          <div className="h-2 w-[85%] rounded-full bg-amber-500" />
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 flex justify-between font-bold text-amber-800 text-xs dark:text-amber-200">
                          <span>{t("fat_reduction")}</span>
                          <span>60%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-white/40 dark:bg-amber-950/40">
                          <div className="h-2 w-[60%] rounded-full bg-amber-500" />
                        </div>
                      </div>
                      <div className="mt-4 rounded-2xl bg-white/40 p-3 dark:bg-amber-950/40">
                        <p className="font-medium text-amber-800 text-xs leading-tight dark:text-amber-200">
                          {t("goal")}{" "}
                          {project.nutritionalGoal || "Balanced Profile"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 4. Target Outcome / Texture (Col Span 1) */}
                  <div className="flex flex-col rounded-[2.5rem] border border-purple-100 bg-[#F3E8FF] p-8 dark:border-purple-800/30 dark:bg-purple-900/20">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/60 text-purple-600 shadow-sm dark:bg-purple-500/20 dark:text-purple-300">
                      <Target size={24} />
                    </div>
                    <h3 className="mb-2 font-bold text-lg text-purple-900 dark:text-purple-100">
                      {t("target_outcome")}
                    </h3>
                    <div className="flex flex-1 flex-col justify-end">
                      <p className="font-medium text-lg text-purple-800 leading-snug dark:text-purple-200">
                        {project.targetOutcome ||
                          "Specific texture and viscosity targets."}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-lg bg-white/50 px-3 py-1 font-bold text-purple-700 text-xs dark:bg-purple-950/40 dark:text-purple-300">
                          {project.targetTexture || "Standard Texture"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 5. Ingredients List (Col Span 1) */}
                  <div className="flex flex-col rounded-[2.5rem] border border-gray-100 bg-white p-8 dark:border-slate-800 dark:bg-[#1e293b]">
                    <div className="mb-1 flex items-center justify-between">
                      <h3 className="flex items-center gap-2 font-bold text-gray-900 text-lg dark:text-slate-100">
                        <Droplet className="text-blue-500" size={20} />

                        {t("ingredients")}
                      </h3>
                      <span className="rounded-lg bg-gray-100 px-2 py-1 font-bold text-gray-600 text-xs dark:bg-slate-700 dark:text-slate-300">
                        {project.ingredients.length} {t("items")}
                      </span>
                    </div>
                    <p className="mb-4 font-bold text-[10px] text-gray-400 uppercase tracking-wider dark:text-slate-500">
                      {t("derived_from_formulation")}
                    </p>
                    <div className="scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-slate-700 max-h-[200px] flex-1 space-y-3 overflow-y-auto pe-2">
                      {project.ingredients.map((ing, i) => (
                        <div
                          className="flex items-center justify-between rounded-2xl bg-gray-50 p-3 dark:bg-slate-900/50"
                          key={i}
                        >
                          <span className="font-medium text-gray-700 text-sm dark:text-slate-300">
                            {ing.name}
                          </span>
                          <span className="font-bold text-gray-900 text-sm dark:text-slate-100">
                            {ing.weight}g
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 6. Recent Runs (Col Span 3, responsive) */}
                  <RecentRunsSection projectId={project._id} />
                </div>
              </div>
            </MotionDiv>
          </div>
        )}
      </AnimatePresence>

      <EditProjectModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveEdit}
        project={project}
        teamMembers={teamMembers}
      />

      <VersionHistoryModal
        currentVersion={project.version}
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        projectId={project._id}
      />
    </>
  );
};

// ── Sub-component: Recent Runs for this project ────────────────────
const RecentRunsSection: React.FC<{ projectId: Id<"projects"> }> = ({
  projectId,
}) => {
  const { t } = useTranslation();
  const { language } = useSettings();
  const runs = useQuery(api.runs.getByProject, { projectId, language });
  const navigate = useNavigate();
  return (
    <div className="col-span-1 rounded-[2.5rem] border border-gray-100 bg-white p-8 md:col-span-2 lg:col-span-3 dark:border-slate-800 dark:bg-[#1e293b]">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400">
          <Beaker size={20} />
        </div>
        <h3 className="font-bold text-gray-900 text-xl dark:text-slate-100">
          {t("recent_runs")}
        </h3>
      </div>

      {runs === undefined ? (
        <p className="py-6 text-center font-medium text-gray-400 dark:text-slate-500">
          {t("loading_runs")}
        </p>
      ) : runs.length === 0 ? (
        <div className="rounded-[2rem] border border-gray-200 border-dashed bg-gray-50 py-8 text-center dark:border-slate-700 dark:bg-slate-800">
          <p className="font-medium text-gray-400 dark:text-slate-500">
            {t("no_runs_recorded_yet")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {runs
            .sort((a, b) => b.startTime - a.startTime)
            .slice(0, 6)
            .map((run) => {
              const dataEntries = run.data
                ? Object.entries(run.data as Record<string, number>)
                : [];
              return (
                <div
                  className="group cursor-pointer rounded-[2rem] border border-gray-100 bg-gray-50 p-5 transition-all hover:border-transparent hover:bg-white hover:shadow-lg dark:border-slate-700 dark:bg-slate-900/50 dark:hover:bg-slate-800 dark:hover:shadow-black/20"
                  key={run._id}
                  onClick={() => navigate(`/run/${run._id}`)}
                >
                  <div className="mb-2 flex items-start justify-between">
                    <span className="font-bold text-gray-400 text-xs uppercase tracking-wider dark:text-slate-500">
                      {run.batchCode}
                    </span>
                    <span className="text-gray-400 text-xs dark:text-slate-500">
                      {DateTime.fromMillis(run.startTime).toLocaleString(
                        DateTime.DATE_SHORT
                      )}
                    </span>
                  </div>
                  <h4 className="mb-1 font-bold text-gray-900 text-lg dark:text-slate-100">
                    {run.durationString}
                  </h4>

                  {dataEntries.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {dataEntries.slice(0, 3).map(([key, val]) => (
                        <div className="flex justify-between text-sm" key={key}>
                          <span className="text-gray-500 capitalize dark:text-slate-400">
                            {key}
                          </span>
                          <span className="font-semibold text-gray-900 dark:text-slate-100">
                            {val}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};

export default ProjectDetailsModal;
