import type { Id } from "@flavoneer/backend/data-model";
import { AnimatePresence, type HTMLMotionProps, motion } from "framer-motion";
import {
  Archive,
  ArrowRight,
  Copy,
  Download,
  Edit3,
  MoreHorizontal,
  Play,
  Share2,
  Trash2,
} from "lucide-react";
import { DateTime } from "luxon";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";
import type { EnrichedProject } from "../types";
import ShareModal from "./ShareModal";
import UserAvatar from "./user-avatar";

const MotionDiv = motion.div as React.FC<
  HTMLMotionProps<"div"> & { className?: string; children?: React.ReactNode }
>;

interface ProjectCardProps {
  onArchive?: (projectId: Id<"projects">) => void;
  onDelete?: (projectId: Id<"projects">) => void;
  onDuplicate?: (project: EnrichedProject) => void;
  onStartRun?: (projectId: Id<"projects">) => void;
  onViewDetails?: (project: EnrichedProject) => void;
  project: EnrichedProject;
  teamMembers?: { userEmail: string; userId: string; userName: string }[];
}

// Flavoneer tonal palette — deterministic, brand-safe project differentiation.
const PASTEL_THEMES = [
  {
    bg: "bg-[#dff4dc] dark:bg-[#214f40]",
    text: "text-[#173e33] dark:text-[#f7f4df]",
    bar: "bg-[#ff7738]",
    sub: "text-[#527568] dark:text-[#b9d8c9]",
    border: "border-[#b9dcc0]",
    buttonHover: "group-hover/btn:text-[#1c4a3c]",
  },
  {
    bg: "bg-[#fff2cf] dark:bg-[#3e4a2f]",
    text: "text-[#173e33] dark:text-[#fff5d4]",
    bar: "bg-[#f5a623]",
    sub: "text-[#6f714e] dark:text-[#ddd8aa]",
    border: "border-[#f2d798]",
    buttonHover: "group-hover/btn:text-[#8a5208]",
  },
  {
    bg: "bg-[#e8f1da] dark:bg-[#294b3b]",
    text: "text-[#173e33] dark:text-[#f3f7e7]",
    bar: "bg-[#1c4a3c]",
    sub: "text-[#607457] dark:text-[#bfd1b3]",
    border: "border-[#cadcaf]",
    buttonHover: "group-hover/btn:text-[#1c4a3c]",
  },
  {
    bg: "bg-[#ffe1c8] dark:bg-[#4b3a2a]",
    text: "text-[#173e33] dark:text-[#fff0df]",
    bar: "bg-[#ff7738]",
    sub: "text-[#7d6250] dark:text-[#e5c9b1]",
    border: "border-[#f4bd91]",
    buttonHover: "group-hover/btn:text-[#c9501a]",
  },
  {
    bg: "bg-[#d9f1e6] dark:bg-[#1d5044]",
    text: "text-[#173e33] dark:text-[#ecfff5]",
    bar: "bg-[#285b4d]",
    sub: "text-[#527568] dark:text-[#b5ddc9]",
    border: "border-[#b6ddca]",
    buttonHover: "group-hover/btn:text-[#1c4a3c]",
  },
];

const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onViewDetails,
  onDuplicate,
  onDelete,
  onArchive,
  onStartRun,
  teamMembers,
}) => {
  const { t } = useTranslation();
  const { language, isRTL } = useSettings();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Deterministic color assignment
  const colorIndex =
    project._id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    PASTEL_THEMES.length;
  const theme = PASTEL_THEMES[colorIndex];

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleStartRun = () => {
    if (onStartRun) {
      onStartRun(project._id);
    } else {
      navigate("/runs");
    }
    setIsMenuOpen(false);
  };

  const handleDuplicate = () => {
    if (onDuplicate) {
      onDuplicate(project);
    }
    setIsMenuOpen(false);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(project._id);
    }
    setIsMenuOpen(false);
  };

  const handleArchive = () => {
    if (onArchive) {
      onArchive(project._id);
    }
    setIsMenuOpen(false);
  };

  return (
    <>
      <div
        className={`group relative h-full min-h-[280px] min-w-0 rounded-[2.5rem] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-none ${
          isMenuOpen ? "z-40" : "z-0 hover:z-10"
        }`}
        data-testid={`project-card-${project._id}`}
      >
        {/* Background & Decor - Lower z-index */}
        <div
          className={`pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[2.5rem] ${theme.bg} border-0`}
        >
          {/* Removed decorative blob for cleaner look and high contrast */}
        </div>

        {/* Main Content - z-10 */}
        <div className="relative z-10 flex min-h-[280px] flex-col gap-4 p-6 sm:p-8">
          {/* Header */}
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2 overflow-hidden">
              <div className="max-w-full truncate rounded-full bg-white/80 px-4 py-1.5 font-black text-gray-900 text-xs uppercase tracking-wider shadow-sm backdrop-blur-md dark:bg-white/10 dark:text-white">
                {t(project.category || "r_and_d")}
              </div>
              {project.status && (
                <div
                  className={`rounded-full border px-3 py-1.5 font-black text-[10px] uppercase tracking-wider shadow-sm ${
                    project.status === "Released"
                      ? "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : project.status === "Under Review"
                        ? "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-800/50 dark:bg-amber-900/30 dark:text-amber-400"
                        : "border-gray-200 bg-white/80 text-gray-700 dark:border-slate-700 dark:bg-white/10 dark:text-slate-300"
                  }`}
                >
                  {t(project.status.toLowerCase().replace(/ /g, "_"))}
                </div>
              )}
            </div>

            {/* Context Menu Trigger */}
            <div className="relative shrink-0" ref={menuRef}>
              <button
                className="rounded-full p-2 text-gray-900 transition-colors hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                <MoreHorizontal size={20} />
              </button>

              {/* Dropdown Menu */}
              <AnimatePresence>
                {isMenuOpen && (
                  <MotionDiv
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="absolute end-0 top-10 z-30 w-56 origin-top-end rounded-2xl border border-gray-100 bg-white/95 p-2 shadow-xl backdrop-blur-md dark:border-slate-700 dark:bg-[#0f172a]/95"
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.1 }}
                  >
                    <div className="flex flex-col gap-1">
                      <button
                        className="flex items-center gap-3 rounded-xl px-3 py-2 text-start font-bold text-gray-700 text-sm transition-colors hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-white/10"
                        onClick={() => {
                          onViewDetails?.(project);
                          setIsMenuOpen(false);
                        }}
                      >
                        <Edit3 size={16} /> {t("editProject")}
                      </button>
                      <button
                        className="flex items-center gap-3 rounded-xl px-3 py-2 text-start font-bold text-gray-700 text-sm transition-colors hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-white/10"
                        onClick={handleDuplicate}
                      >
                        <Copy size={16} /> {t("duplicateFormulation")}
                      </button>
                      <button
                        className="flex items-center gap-3 rounded-xl px-3 py-2 text-start font-bold text-gray-700 text-sm transition-colors hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-white/10"
                        onClick={() => {
                          setIsShareModalOpen(true);
                          setIsMenuOpen(false);
                        }}
                      >
                        <Share2 size={16} /> {t("share_project")}
                      </button>
                      <button
                        className={`flex items-center gap-3 rounded-xl px-3 py-2 text-start font-bold text-sm transition-colors ${
                          project.status === "Released"
                            ? "text-gray-700 hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-white/10"
                            : "hidden cursor-not-allowed bg-gray-50/50 text-gray-400 dark:bg-slate-800/50 dark:text-gray-600"
                        }`}
                        disabled={project.status !== "Released"}
                        onClick={handleStartRun}
                        title={
                          project.status === "Released"
                            ? ""
                            : "Cannot start a run for a non-released formulation"
                        }
                      >
                        <Play size={16} /> {t("startNewRun")}
                      </button>
                      {project.status === "Released" && (
                        <button className="flex hidden items-center gap-3 rounded-xl px-3 py-2 text-start font-bold text-gray-700 text-sm transition-colors hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-white/10">
                          <Download size={16} /> {t("exportData")}
                        </button>
                      )}
                      <div className="mx-2 my-1 h-px bg-gray-200 dark:bg-slate-700" />
                      <button
                        className="flex items-center gap-3 rounded-xl px-3 py-2 text-start font-bold text-gray-500 text-sm transition-colors hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-white/10"
                        onClick={handleArchive}
                      >
                        <Archive size={16} /> {t("archiveProject")}
                      </button>
                      <button
                        className="flex items-center gap-3 rounded-xl px-3 py-2 text-start font-bold text-red-600 text-sm transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={handleDelete}
                      >
                        <Trash2 size={16} /> {t("deleteProject")}
                      </button>
                    </div>
                  </MotionDiv>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Card Body */}
          <div className="min-w-0">
            <h3 className="mb-1 line-clamp-2 text-start font-black text-3xl text-gray-900 leading-tight dark:text-slate-100">
              {project.name}
            </h3>
            <p className="mb-2 flex items-center gap-2 text-start font-bold text-gray-600 text-sm dark:text-slate-400">
              <span>v{project.version}</span>
              <span>•</span>
              <span>
                {DateTime.fromMillis(project._creationTime).toRelative({
                  locale: language === "ar" ? "ar" : "en",
                })}
              </span>
            </p>

            {/* Release Notes Preview */}
            {project.releaseNotes && (
              <div className="line-clamp-2 rounded-xl border border-white/20 bg-white/50 p-2 text-gray-600 text-xs dark:border-slate-700/30 dark:bg-black/10 dark:text-slate-400">
                <span className="font-bold">{t("notes")}</span>{" "}
                {project.releaseNotes}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-auto">
            {/* <div className="flex justify-between text-xs font-bold mb-3">
            <span className="text-gray-900 dark:text-slate-200">{t('progress')}</span>
            <span className="text-gray-900 dark:text-slate-200">{project.progress}%</span>
          </div>
          <div className="w-full bg-white/60 dark:bg-black/20 rounded-full h-3 mb-6 overflow-hidden p-[2px]">
            <div
              className={`h-full rounded-full ${theme.bar}`}
              style={{ width: `${project.progress}%` }}
            />
          </div> */}

            {/* Team Member Avatars */}
            {teamMembers && teamMembers.length > 0 && (
              <div className="mb-4 flex items-center">
                <div className="flex -space-x-2.5">
                  {teamMembers.slice(0, 4).map((member) => (
                    <UserAvatar
                      className="h-8 w-8 rounded-full border-2 border-white object-cover shadow-sm dark:border-slate-800"
                      key={member.userId}
                      label={member.userName}
                      name={member.userName}
                      seed={member.userEmail}
                      size={32}
                      title={member.userName}
                    />
                  ))}
                  {teamMembers.length > 4 && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-200 shadow-sm dark:border-slate-800 dark:bg-slate-700">
                      <span className="font-black text-[10px] text-gray-600 dark:text-slate-300">
                        +{teamMembers.length - 4}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <button
              className={`group/btn flex w-full items-center justify-center gap-2 rounded-2xl bg-white/90 py-4 font-black text-gray-900 text-sm shadow-sm backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:bg-white dark:bg-white/10 dark:text-white dark:hover:bg-white/15 ${theme.buttonHover}`}
              onClick={() => (onViewDetails ? onViewDetails(project) : null)}
            >
              {t("viewDetails")}
              <ArrowRight
                className={`transition-transform duration-300 group-hover/btn:translate-x-1 ${isRTL ? "-scale-x-100 transform" : ""}`}
                size={18}
              />
            </button>
          </div>
        </div>
      </div>

      <ShareModal
        entityId={project._id}
        entityName={project.name}
        entityType="project"
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />
    </>
  );
};

export default ProjectCard;
