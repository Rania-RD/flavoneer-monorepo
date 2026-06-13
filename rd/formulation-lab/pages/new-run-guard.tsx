import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import type React from "react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { useToast } from "../hooks/useToast";

const NewRunGuard: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const project = useQuery(
    api.projects.get,
    id ? { id: id as Id<"projects"> } : "skip"
  );
  const createNewRun = useMutation(api.runs.createNewRun);
  const logActivity = useMutation(api.activities.log);
  const hasAttempted = useRef(false);

  useEffect(() => {
    let mounted = true;
    if (project === undefined || hasAttempted.current) {
      return;
    }

    const initializeRun = async () => {
      hasAttempted.current = true;
      if (project === null) {
        toast.error(t("project_formulation_not_found"));
        navigate("/", { replace: true });
        return;
      }
      if (project.status !== "Released") {
        toast.error(t("non_released_run_error"));
        navigate("/", { replace: true });
        return;
      }

      try {
        const runId = await createNewRun({
          formulationId: project._id as Id<"projects">,
        });
        await logActivity({
          action: "Started Lab Batch",
          target: project.name,
          page: "URL Init",
        });
        if (mounted) {
          navigate(`/run/${runId}`, { replace: true });
        }
      } catch (e) {
        console.error(e);
        toast.error(t("failed_to_initialize_run"));
        if (mounted) {
          navigate("/", { replace: true });
        }
      }
    };

    initializeRun();

    return () => {
      mounted = false;
    };
  }, [project, navigate, createNewRun, logActivity, toast.error]);

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="font-medium text-gray-500">
          {t("initializing_lab_batch")}
        </p>
      </div>
    </div>
  );
};

export default NewRunGuard;
