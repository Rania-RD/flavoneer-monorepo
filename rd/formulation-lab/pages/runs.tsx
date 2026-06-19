import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import ActiveRunView from "../components/runs/active-run-view";
import BatchDisposalView from "../components/runs/batch-disposal-view";
import RunCompletedView from "../components/runs/run-completed-view";
import RunDetailView from "../components/runs/run-detail-view";
import RunLoadingView from "../components/runs/run-loading-view";
import RunSelectionView from "../components/runs/run-selection-view";
import { useSettings } from "../context/SettingsContext";
import { useTeam } from "../context/TeamContext";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { useRunExecution } from "../hooks/useRunExecution";
import { useToast } from "../hooks/useToast";
import { buildRunsHistory } from "../lib/runs/history";
import type { EnrichedProject, RunListItem } from "../types";

const Runs: React.FC = () => {
  const { language, profile } = useSettings();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { id } = useParams<{ id: string }>();
  const { activeTeamId } = useTeam();
  const [isStartingRun, setIsStartingRun] = React.useState(false);
  const [isAbortModalOpen, setIsAbortModalOpen] = React.useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = React.useState(false);
  const [signatures, setSignatures] = React.useState<Record<string, string>>(
    {}
  );

  const {
    results: projectsRaw,
    status: projectsStatus,
    loadMore: loadMoreProjects,
  } = usePaginatedQuery(
    api.projects.listByTeam,
    activeTeamId
      ? { teamId: activeTeamId, status: "Released", language }
      : { status: "Released", language },
    { initialNumItems: 50 }
  );

  const { results: runsRaw } = usePaginatedQuery(
    api.runs.list,
    activeTeamId ? { teamId: activeTeamId, language } : { language },
    { initialNumItems: 50 }
  );

  const currentUserRoleRaw = useQuery(api.users.getCurrentUserRole, {});
  const isAuthorized =
    currentUserRoleRaw?.role?.permissions?.includes("execute_runs") ||
    currentUserRoleRaw?.role?.key === "admin" ||
    currentUserRoleRaw?.role?.key === "operator";
  const projects: EnrichedProject[] =
    (projectsRaw as unknown as EnrichedProject[]) ?? [];
  const runsHistory = buildRunsHistory(runsRaw as RunListItem[] | undefined);

  const createNewRun = useMutation(api.runs.createNewRun);
  const logActivity = useMutation(api.activities.log);

  const handleStartRunAction = async (
    projectId: string,
    projectName: string
  ) => {
    const project = projects.find((item) => item._id === projectId);
    if (!project?.phases || project.phases.length === 0) {
      toast.error(t("formulation_missing_phases"));
      return;
    }

    setIsStartingRun(true);
    try {
      const runId = await createNewRun({
        formulationId: projectId as Id<"projects">,
      });
      await logActivity({
        action: "Started Lab Batch",
        target: projectName,
        page: "Run Procedure",
      });
      setTimeout(() => {
        setIsStartingRun(false);
        navigate(`/run/${runId}`);
      }, 600);
    } catch (error) {
      console.error(error);
      setIsStartingRun(false);
    }
  };

  const {
    selectedProject,
    selectedRunRecord,
    runStatus,
    setRunStatus,
    batchCode,
    startTime,
    phases,
    activePhase,
    activeStep,
    currentPhaseIndex,
    setCurrentPhaseIndex,
    currentStepIndex,
    setCurrentStepIndex,
    runValues,
    setRunValues,
    checklistState,
    setChecklistState,
    qcValues,
    setQcValues,
    stepLogs,
    setStepLogs,
    sensoryNotes,
    setSensoryNotes,
    sensoryScores,
    setSensoryScores,
    setTimerCompleted,
    conditionalAnswers,
    setConditionalAnswers,
    failureReason,
    setFailureReason,
    validation,
    handleNext,
    handleFinishRun,
    isSaving,
    isDirty,
    handleSaveDraft,
  } = useRunExecution({
    projects,
    runsHistory,
    initialRunId: id,
    rawRuns: runsRaw as RunListItem[] | undefined,
  });

  React.useEffect(() => {
    if (runStatus === "completed") {
      const timer = setTimeout(() => {
        navigate("/dashboard");
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [runStatus, navigate]);

  if (runStatus === "selection") {
    return (
      <RunSelectionView
        currentUserId={currentUserRoleRaw?._id}
        isAuthorized={Boolean(isAuthorized)}
        isStartingRun={isStartingRun}
        loadMoreProjects={loadMoreProjects}
        onStartRun={handleStartRunAction}
        onViewRun={(runId) => navigate(`/run/${runId}`)}
        profile={profile}
        projects={projects}
        projectsStatus={projectsStatus}
        runsHistory={runsHistory}
        setSignatures={setSignatures}
        signatures={signatures}
      />
    );
  }

  if (runStatus === "running" && selectedProject) {
    return (
      <ActiveRunView
        activePhase={activePhase}
        activeStep={activeStep}
        batchCode={batchCode}
        checklistState={checklistState}
        conditionalAnswers={conditionalAnswers}
        currentPhaseIndex={currentPhaseIndex}
        currentStepIndex={currentStepIndex}
        isAbortModalOpen={isAbortModalOpen}
        isDirty={isDirty}
        isSaving={isSaving}
        onAbortAnyway={() => navigate("/dashboard")}
        onBackToSelection={() => {
          setRunStatus("selection");
          navigate("/runs");
        }}
        onCloseAbortModal={() => setIsAbortModalOpen(false)}
        onDraftSaved={() => toast.success(t("progress_saved_as_draft"))}
        onFinishRun={handleFinishRun}
        onNext={handleNext}
        onSaveDraft={handleSaveDraft}
        onTimerComplete={() => setTimerCompleted(true)}
        onUnsavedBack={() => setIsAbortModalOpen(true)}
        phases={phases}
        qcValues={qcValues}
        runValues={runValues}
        selectedProject={selectedProject}
        sensoryNotes={sensoryNotes}
        sensoryScores={sensoryScores}
        setChecklistState={setChecklistState}
        setConditionalAnswers={setConditionalAnswers}
        setCurrentPhaseIndex={setCurrentPhaseIndex}
        setCurrentStepIndex={setCurrentStepIndex}
        setQcValues={setQcValues}
        setRunValues={setRunValues}
        setSensoryNotes={setSensoryNotes}
        setSensoryScores={setSensoryScores}
        setStepLogs={setStepLogs}
        startTime={startTime}
        stepLogs={stepLogs}
        validation={validation}
      />
    );
  }

  if (runStatus === "batch_disposal") {
    return (
      <BatchDisposalView
        failureReason={failureReason}
        isSaving={isSaving}
        onFailureReasonChange={setFailureReason}
        onFinishRun={handleFinishRun}
      />
    );
  }

  if (runStatus === "detail" && selectedRunRecord) {
    return (
      <RunDetailView
        isShareModalOpen={isShareModalOpen}
        onBackToSelection={() => {
          setRunStatus("selection");
          navigate("/runs");
        }}
        onCloseShareModal={() => setIsShareModalOpen(false)}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        selectedRunRecord={selectedRunRecord}
      />
    );
  }

  if (runStatus === "completed") {
    return <RunCompletedView />;
  }

  return <RunLoadingView />;
};

export default Runs;
