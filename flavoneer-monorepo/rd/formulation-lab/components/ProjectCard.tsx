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
import type { Id } from "../convex/_generated/dataModel";
import type { EnrichedProject } from "../types";
import ShareModal from "./ShareModal";

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
  teamMembers?: { userName: string; userAvatarUrl?: string }[];
}

// Pastel Palette - Updated for High Contrast & Vibrancy
const PASTEL_THEMES = [
  {
    bg: "bg-rose-100 dark:bg-rose-900/20",
    text: "text-gray-900 dark:text-slate-100",
    bar: "bg-rose-500",
    sub: "text-gray-600 dark:text-rose-200/70",
    border: "border-rose-200",
    buttonHover: "group-hover/btn:text-rose-800",
  },
  {
    bg: "bg-violet-100 dark:bg-violet-900/20",
    text: "text-gray-900 dark:text-slate-100",
    bar: "bg-violet-600",
    sub: "text-gray-600 dark:text-violet-200/70",
    border: "border-violet-200",
    buttonHover: "group-hover/btn:text-violet-800",
  },
  {
    bg: "bg-blue-100 dark:bg-blue-900/20",
    text: "text-gray-900 dark:text-slate-100",
    bar: "bg-blue-600",
    sub: "text-gray-600 dark:text-blue-200/70",
    border: "border-blue-200",
    buttonHover: "group-hover/btn:text-blue-800",
  },
  {
    bg: "bg-orange-100 dark:bg-orange-900/20",
    text: "text-gray-900 dark:text-slate-100",
    bar: "bg-orange-600",
    sub: "text-gray-600 dark:text-orange-200/70",
    border: "border-orange-200",
    buttonHover: "group-hover/btn:text-orange-800",
  },
  {
    bg: "bg-emerald-100 dark:bg-emerald-900/20",
    text: "text-gray-900 dark:text-slate-100",
    bar: "bg-emerald-600",
    sub: "text-gray-600 dark:text-emerald-200/70",
    border: "border-emerald-200",
    buttonHover: "group-hover/btn:text-emerald-800",
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
        className={
          "group relative h-[280px] rounded-[2.5rem] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-none"
        }
      >
        {/* Background & Decor - Lower z-index */}
        <div
          className={`pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[2.5rem] ${theme.bg} border-0`}
        >
          {/* Removed decorative blob for cleaner look and high contrast */}
        </div>

        {/* Main Content - z-10 */}
        <div className="relative z-10 flex h-full flex-col justify-between p-8">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-white/80 px-4 py-1.5 font-black text-gray-900 text-xs uppercase tracking-wider shadow-sm backdrop-blur-md dark:bg-white/10 dark:text-white">
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
            <div className="relative" ref={menuRef}>
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
                          onViewDetails && onViewDetails(project);
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
                          project.status !== "Released"
                            ? "hidden cursor-not-allowed bg-gray-50/50 text-gray-400 dark:bg-slate-800/50 dark:text-gray-600"
                            : "text-gray-700 hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-white/10"
                        }`}
                        disabled={project.status !== "Released"}
                        onClick={handleStartRun}
                        title={
                          project.status !== "Released"
                            ? "Cannot start a run for a non-released formulation"
                            : ""
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
          <div className="mt-4">
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
                  {teamMembers.slice(0, 4).map((member, idx) => (
                    <img
                      alt={member.userName}
                      className="h-8 w-8 rounded-full border-2 border-white object-cover shadow-sm dark:border-slate-800"
                      key={idx}
                      src={
                        member.userAvatarUrl ||
                        `https://api.dicebear.com/9.x/thumbs/svg?seed=${member.userName}`
                      }
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
              className={`group/btn flex w-full items-center justify-center gap-2 rounded-2xl bg-white/90 py-4 font-black text-gray-900 text-sm shadow-sm backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:bg-white dark:bg-white/10 dark:text-white ${theme.buttonHover}`}
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
