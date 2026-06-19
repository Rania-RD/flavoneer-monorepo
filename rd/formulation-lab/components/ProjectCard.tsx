import { AnimatePresence, type HTMLMotionProps, motion } from "framer-motion";
import {
  Archive,
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

const STATUS_STYLES: Record<string, string> = {
  Draft:
    "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Released:
    "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  "Under Review":
    "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
};

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
  const { language } = useSettings();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
    onDuplicate?.(project);
    setIsMenuOpen(false);
  };

  const handleDelete = () => {
    onDelete?.(project._id);
    setIsMenuOpen(false);
  };

  const handleArchive = () => {
    onArchive?.(project._id);
    setIsMenuOpen(false);
  };

  return (
    <>
      <article
        className="enterprise-panel group flex min-h-[220px] flex-col transition-colors hover:border-slate-500 dark:hover:border-slate-600"
        data-testid="run-project-card"
      >
        <div className="flex items-start justify-between border-slate-200 border-b px-4 py-3 dark:border-slate-800">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="enterprise-badge max-w-[180px] truncate">
              {t(project.category || "r_and_d")}
            </span>
            {project.status && (
              <span
                className={`enterprise-badge ${
                  STATUS_STYLES[project.status] ?? STATUS_STYLES.Draft
                }`}
              >
                {t(project.status.toLowerCase().replace(/ /g, "_"))}
              </span>
            )}
          </div>

          <div className="relative" ref={menuRef}>
            <button
              className="enterprise-button h-8 w-8 p-0"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              type="button"
            >
              <MoreHorizontal size={16} />
            </button>

            <AnimatePresence>
              {isMenuOpen && (
                <MotionDiv
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="absolute end-0 top-10 z-30 w-56 origin-top-end border border-slate-300 bg-white p-1 shadow-none dark:border-slate-700 dark:bg-slate-950"
                  exit={{ opacity: 0, scale: 0.98, y: 4 }}
                  initial={{ opacity: 0, scale: 0.98, y: 4 }}
                  transition={{ duration: 0.08 }}
                >
                  <div className="flex flex-col">
                    <button
                      className="flex items-center gap-3 px-3 py-2 text-start font-semibold text-slate-700 text-sm hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      onClick={() => {
                        onViewDetails?.(project);
                        setIsMenuOpen(false);
                      }}
                      type="button"
                    >
                      <Edit3 size={15} /> {t("editProject")}
                    </button>
                    <button
                      className="flex items-center gap-3 px-3 py-2 text-start font-semibold text-slate-700 text-sm hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      onClick={handleDuplicate}
                      type="button"
                    >
                      <Copy size={15} /> {t("duplicateFormulation")}
                    </button>
                    <button
                      className="flex items-center gap-3 px-3 py-2 text-start font-semibold text-slate-700 text-sm hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      onClick={() => {
                        setIsShareModalOpen(true);
                        setIsMenuOpen(false);
                      }}
                      type="button"
                    >
                      <Share2 size={15} /> {t("share_project")}
                    </button>
                    <button
                      className={`flex items-center gap-3 px-3 py-2 text-start font-semibold text-sm ${
                        project.status !== "Released"
                          ? "hidden cursor-not-allowed text-slate-400"
                          : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      }`}
                      disabled={project.status !== "Released"}
                      onClick={handleStartRun}
                      type="button"
                    >
                      <Play size={15} /> {t("startNewRun")}
                    </button>
                    {project.status === "Released" && (
                      <button
                        className="flex hidden items-center gap-3 px-3 py-2 text-start font-semibold text-slate-700 text-sm hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        type="button"
                      >
                        <Download size={15} /> {t("exportData")}
                      </button>
                    )}
                    <div className="my-1 h-px bg-slate-200 dark:bg-slate-800" />
                    <button
                      className="flex items-center gap-3 px-3 py-2 text-start font-semibold text-slate-500 text-sm hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                      onClick={handleArchive}
                      type="button"
                    >
                      <Archive size={15} /> {t("archiveProject")}
                    </button>
                    <button
                      className="flex items-center gap-3 px-3 py-2 text-start font-semibold text-red-700 text-sm hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                      onClick={handleDelete}
                      type="button"
                    >
                      <Trash2 size={15} /> {t("deleteProject")}
                    </button>
                  </div>
                </MotionDiv>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex flex-1 flex-col px-4 py-4">
          <h3 className="line-clamp-2 text-start font-semibold text-lg text-slate-950 leading-snug dark:text-slate-100">
            {project.name}
          </h3>
          <p className="mt-2 flex items-center gap-2 text-start font-medium text-slate-500 text-xs dark:text-slate-400">
            <span>v{project.version}</span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span>
              {DateTime.fromMillis(project._creationTime).toRelative({
                locale: language === "ar" ? "ar" : "en",
              })}
            </span>
          </p>

          {project.releaseNotes && (
            <div className="mt-3 line-clamp-2 border border-slate-200 bg-slate-50 p-2 text-slate-600 text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
              <span className="font-semibold">{t("notes")}</span>{" "}
              {project.releaseNotes}
            </div>
          )}

          <div className="mt-auto pt-4">
            {teamMembers && teamMembers.length > 0 && (
              <div className="mb-3 flex items-center">
                <div className="flex -space-x-1.5">
                  {teamMembers.slice(0, 4).map((member, idx) => (
                    <img
                      alt={member.userName}
                      className="h-7 w-7 border border-white object-cover dark:border-slate-800"
                      key={idx}
                      src={
                        member.userAvatarUrl ||
                        `https://api.dicebear.com/9.x/thumbs/svg?seed=${member.userName}`
                      }
                      title={member.userName}
                    />
                  ))}
                  {teamMembers.length > 4 && (
                    <div className="flex h-7 w-7 items-center justify-center border border-white bg-slate-200 dark:border-slate-800 dark:bg-slate-700">
                      <span className="font-semibold text-[10px] text-slate-600 dark:text-slate-300">
                        +{teamMembers.length - 4}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <button
              className="enterprise-button-primary w-full"
              onClick={() => onViewDetails?.(project)}
              type="button"
            >
              {t("viewDetails")}
            </button>
          </div>
        </div>
      </article>

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
