import { useMutation, useQuery } from "convex/react";
import { Check, CheckCircle, MessageSquare, Send, X } from "lucide-react";
import { DateTime } from "luxon";
import type React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

interface ReviewPanelProps {
  currentUser?: { name: string; id: string };
  isOpen: boolean;
  onClose: () => void;
  projectId: Id<"projects">;
}

export const ReviewPanel: React.FC<ReviewPanelProps> = ({
  projectId,
  isOpen,
  onClose,
  currentUser = { name: "Current User", id: "user-id" },
}) => {
  const { t } = useTranslation();
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const comments = useQuery(api.comments.list, { projectId });
  const addComment = useMutation(api.comments.add);
  const resolveComment = useMutation(api.comments.resolve);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await addComment({
        projectId,
        text: newComment.trim(),
        authorName: currentUser.name,
        authorId: currentUser.id,
      });
      setNewComment("");
    } catch (error) {
      console.error("Failed to add comment", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async (commentId: Id<"comments">) => {
    try {
      await resolveComment({
        commentId,
        resolvedBy: currentUser.name,
      });
    } catch (error) {
      console.error("Failed to resolve comment", error);
    }
  };

  if (!isOpen) {
    return null;
  }

  const activeComments = comments?.filter((c) => !c.isResolved) || [];
  const resolvedComments = comments?.filter((c) => c.isResolved) || [];

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40"
        onClick={onClose}
      />
      <div className="fixed end-0 top-0 z-50 flex h-full w-full translate-x-0 transform flex-col border-gray-100 border-l bg-white shadow-2xl transition-transform duration-300 sm:w-[400px] dark:border-slate-800 dark:bg-[#1e293b]">
        <div className="flex shrink-0 items-center justify-between border-gray-100 border-b p-6 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
              <MessageSquare size={20} />
            </div>
            <h2 className="font-bold text-gray-900 text-xl dark:text-white">
              {t("review_comments")}
            </h2>
          </div>
          <button
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {comments === undefined ? (
            <div className="py-8 text-center text-gray-500">
              {t("loading_comments")}
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center text-gray-400">
              <MessageSquare className="h-12 w-12 opacity-20" />
              <p>{t("no_comments_yet_start_the_review_process")}</p>
            </div>
          ) : (
            <>
              {activeComments.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-500 text-xs uppercase tracking-wider">
                    {t("active_issues")}
                    {activeComments.length})
                  </h3>
                  <div className="space-y-3">
                    {activeComments.map((comment) => (
                      <div
                        className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800/30 dark:bg-amber-900/10"
                        key={comment._id}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-bold text-gray-900 text-sm dark:text-amber-100">
                              {comment.authorName}
                            </p>
                            <p className="text-amber-600/70 text-xs dark:text-amber-500/70">
                              {DateTime.fromMillis(
                                comment.createdAt
                              ).toLocaleString(DateTime.DATETIME_SHORT)}
                            </p>
                          </div>
                          <button
                            className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-3 py-1.5 font-bold text-amber-700 text-xs shadow-sm transition-colors hover:border-amber-300 hover:bg-amber-100 dark:border-amber-700/50 dark:bg-slate-800 dark:text-amber-400 dark:hover:bg-amber-900/30"
                            onClick={() => handleResolve(comment._id)}
                          >
                            <CheckCircle size={14} /> {t("resolve")}
                          </button>
                        </div>
                        <p className="text-gray-700 text-sm leading-relaxed dark:text-slate-300">
                          {comment.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {resolvedComments.length > 0 && (
                <div className="space-y-4 border-gray-100 border-t pt-4 dark:border-slate-800">
                  <h3 className="font-bold text-gray-400 text-xs uppercase tracking-wider">
                    {t("resolved")}
                    {resolvedComments.length})
                  </h3>
                  <div className="space-y-3">
                    {resolvedComments.map((comment) => (
                      <div
                        className="space-y-2 rounded-xl border border-gray-100 bg-gray-50/50 p-4 opacity-75 dark:border-slate-700/50 dark:bg-slate-800/30"
                        key={comment._id}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-500 text-sm line-through dark:text-slate-400">
                            {comment.authorName}
                          </p>
                          <span className="flex items-center gap-1 font-bold text-emerald-600 text-xs dark:text-emerald-400">
                            <Check size={12} /> {t("resolved_by")}{" "}
                            {comment.resolvedBy}
                          </span>
                        </div>
                        <p className="text-gray-500 text-sm dark:text-slate-400">
                          {comment.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="shrink-0 border-gray-100 border-t bg-gray-50/50 p-6 dark:border-slate-800 dark:bg-[#1e293b]/50">
          <form className="relative" onSubmit={handleSubmit}>
            <textarea
              className="h-24 w-full resize-none rounded-xl border border-gray-200 bg-white p-3 pe-12 text-sm focus:border-transparent focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={t("add_review_comment")}
              value={newComment}
            />
            <button
              className="absolute end-3 bottom-3 rounded-lg bg-indigo-600 p-2 text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
              disabled={!newComment.trim() || isSubmitting}
              type="submit"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default ReviewPanel;
