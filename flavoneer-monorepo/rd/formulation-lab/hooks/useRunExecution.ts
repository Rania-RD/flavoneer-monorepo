import { useMutation } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { generateBatchCode, normalizeProjectPhases } from "../lib/runUtils";
import type { EnrichedProject, RunListItem, RunRecord } from "../types";
import {
  buildIngredientsUsage,
  hydrateRunPhases,
  toRunRecord,
} from "./run-execution/runPersistence";
import { getRunValidation } from "./run-execution/runValidation";

interface UseRunExecutionProps {
  initialRunId?: string;
  projects: EnrichedProject[];
  rawRuns?: RunListItem[];
  runsHistory: RunRecord[];
}

export const useRunExecution = ({
  projects,
  runsHistory,
  initialRunId,
  rawRuns,
}: UseRunExecutionProps) => {
  // Convex Mutations
  const startRunMutation = useMutation(api.runs.startRun);
  const finishRunMutation = useMutation(api.runs.finishRun);
  const saveDraftMutation = useMutation(api.runs.saveDraft);
  const updateStepWeight = useMutation(api.runs.updateStepWeight);

  // State
  const [selectedProject, setSelectedProject] =
    useState<EnrichedProject | null>(null);
  const [runStatus, setRunStatus] = useState<
    "selection" | "running" | "completed" | "detail" | "batch_disposal"
  >("selection");
  const [selectedRunRecord, setSelectedRunRecord] = useState<RunRecord | null>(
    null
  );

  // Execution State
  const [batchCode, setBatchCode] = useState<string>("");
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [runValues, setRunValues] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isDirtyState, setIsDirtyState] = useState(false);
  const isDirtyRef = useRef(false);
  const savedSignatureRef = useRef<string>("");

  const setIsDirty = (value: boolean) => {
    isDirtyRef.current = value;
    setIsDirtyState(value);
  };

  // Define isDirty as alias for external components
  const isDirty = isDirtyState;

  // Step Interaction State
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>(
    {}
  );
  const [qcValues, setQcValues] = useState<Record<string, number>>({});
  const [lotNumbers, setLotNumbers] = useState<Record<string, string>>({});
  const [sensoryNotes, setSensoryNotes] = useState("");
  const [sensoryScores, setSensoryScores] = useState({
    texture: 3,
    color: 3,
    taste: 3,
  });
  const [runOutcome, setRunOutcome] = useState<"success" | "failure">(
    "success"
  );
  const [stepLogs, setStepLogs] = useState<
    Record<string, { startTime?: number; completed?: boolean }>
  >({});
  const [conditionalAnswers, setConditionalAnswers] = useState<
    Record<string, "pass" | "fail" | null>
  >({});
  const [failureReason, setFailureReason] = useState<string>("");
  const [timerCompleted, setTimerCompleted] = useState(false);

  // Load Initial Run state from URL and handle resets
  useEffect(() => {
    if (initialRunId && rawRuns && rawRuns.length > 0) {
      const activeRun = rawRuns.find((r) => r._id === initialRunId);
      if (activeRun && runStatus === "selection") {
        const project = projects.find((p) => p._id === activeRun.projectId);
        if (project) {
          setSelectedProject(project);
        }
        setBatchCode(activeRun.batchCode);
        setStartTime(new Date(activeRun.startTime));
        setActiveRunId(activeRun._id);

        if (activeRun.endTime || activeRun.sharedRole === "viewer") {
          setRunStatus("detail");
          const historyRecord = runsHistory.find((r) => r.id === activeRun._id);
          setSelectedRunRecord(historyRecord || toRunRecord(activeRun));
        } else {
          setRunStatus("running");
        }

        // Load data if partially completed
        if (activeRun.data) {
          setRunValues(activeRun.data);
        }

        // Hydrate saved position if available
        if (activeRun.currentPhaseIndex !== undefined) {
          setCurrentPhaseIndex(activeRun.currentPhaseIndex);
        }
        if (activeRun.currentStepIndex !== undefined) {
          setCurrentStepIndex(activeRun.currentStepIndex);
        }
      }
    } else if (!initialRunId && runStatus !== "selection") {
      // Clean redirect fix: if URL drops to /runs, force app to selection UI.
      setRunStatus("selection");
      setActiveRunId(null);
      setSelectedProject(null);
    }
  }, [initialRunId, rawRuns, projects, runStatus]);

  // Track Unsaved Changes synchronously to avoid closure staleness
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Precision Dirty State Tracking via Content Signature
  const currentSignature = JSON.stringify({
    runValues,
    qcValues,
    stepLogs,
    checklistState,
    conditionalAnswers,
    sensoryNotes,
    sensoryScores,
  });

  // Use a ref to ensure async handlers always see the latest signature
  const currentSignatureRef = useRef(currentSignature);
  useEffect(() => {
    currentSignatureRef.current = currentSignature;
  }, [currentSignature]);

  useEffect(() => {
    if (runStatus === "running") {
      if (savedSignatureRef.current) {
        setIsDirty(currentSignature !== savedSignatureRef.current);
      } else {
        savedSignatureRef.current = currentSignature;
        setIsDirty(false);
      }
    } else {
      savedSignatureRef.current = "";
      setIsDirty(false);
    }
  }, [runStatus, currentSignature]);

  // Computed Properties
  const phases = useMemo(() => {
    // If we have an active run with loaded phases from db, use them
    if (initialRunId && rawRuns) {
      const activeRun = rawRuns.find((r) => r._id === initialRunId);
      if (activeRun && activeRun.phases && activeRun.phases.length > 0) {
        return hydrateRunPhases(activeRun.phases);
      }
    }
    // Otherwise fallback to project master definition
    return selectedProject ? normalizeProjectPhases(selectedProject) : [];
  }, [selectedProject, initialRunId, rawRuns]);

  const activePhase = phases[currentPhaseIndex];
  const activeStep = activePhase?.steps?.[currentStepIndex];

  const validation = useMemo(() => {
    return getRunValidation({
      activePhase,
      conditionalAnswers,
      currentStepIndex,
      qcValues,
      runValues,
      stepLogs,
    });
  }, [
    activePhase,
    currentStepIndex,
    runValues,
    stepLogs,
    qcValues,
    conditionalAnswers,
  ]);

  // Handlers
  const handleStartRun = async (project: EnrichedProject) => {
    setSelectedProject(project);
    const code = generateBatchCode(project, runsHistory.length);
    setBatchCode(code);
    setStartTime(new Date());
    setRunStatus("running");
    setRunValues({});
    setStepLogs({});
    setCurrentPhaseIndex(0);
    setCurrentStepIndex(0);

    try {
      const runId = await startRunMutation({
        projectId: project._id,
        batchCode: code,
        startTime: Date.now(),
      });
      setActiveRunId(runId);
    } catch (err) {
      console.error("Failed to start run", err);
    }
  };

  const handleNext = () => {
    if (!activePhase) {
      return;
    }

    const currentStep = activePhase.steps[currentStepIndex];

    // Check if we are currently on a conditional step that failed and triggers disposal
    if (currentStep && currentStep.type === "conditional") {
      const answer = conditionalAnswers[currentStep.id];
      if (
        answer === "fail" &&
        currentStep.onFail?.action === "redirect_dispose"
      ) {
        // Trigger Batch Disposal Redirect
        setRunStatus("batch_disposal");
        return;
      }
    }

    // Move to next step in current phase
    if (currentStepIndex < activePhase.steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
      return;
    }

    // Move to next phase
    if (currentPhaseIndex < phases.length - 1) {
      setCurrentPhaseIndex(currentPhaseIndex + 1);
      setCurrentStepIndex(0);
    }
  };

  const handleFinishRun = async () => {
    if (!(activeRunId && startTime)) {
      return;
    }
    setIsSaving(true);
    const endTime = new Date();

    const ingredientsUsage = buildIngredientsUsage(
      phases,
      runValues,
      selectedProject
    );

    try {
      await finishRunMutation({
        runId: activeRunId as Id<"runs">,
        endTime: endTime.getTime(),
        data: runValues,
        status: runStatus === "batch_disposal" ? "failed" : "completed",
        failureReason:
          runStatus === "batch_disposal" ? failureReason : undefined,
        ingredients: ingredientsUsage,
      });
      savedSignatureRef.current = ""; // Clear baseline
      setIsDirty(false); // Reset dirty flag before leaving
      setRunStatus("completed");
    } catch (err) {
      console.error("Failed to finish run", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!activeRunId) {
      return;
    }
    setIsSaving(true);

    try {
      await saveDraftMutation({
        runId: activeRunId as Id<"runs">,
        data: runValues,
        currentPhaseIndex,
        currentStepIndex,
      });

      // Update baseline signature to immediately clear dirty state
      savedSignatureRef.current = currentSignatureRef.current;
      setIsDirty(false);

      // We don't change runStatus because it should remain 'running' (In Progress)
      return true;
    } catch (err) {
      console.error("Failed to save draft", err);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    // State
    selectedProject,
    setSelectedProject,
    runStatus,
    setRunStatus,
    selectedRunRecord,
    setSelectedRunRecord,
    batchCode,
    startTime,
    runValues,
    setRunValues,
    isSaving,
    activeRunId,
    currentPhaseIndex,
    setCurrentPhaseIndex,
    currentStepIndex,
    setCurrentStepIndex,
    checklistState,
    setChecklistState,
    qcValues,
    setQcValues,
    lotNumbers,
    setLotNumbers,
    sensoryNotes,
    setSensoryNotes,
    sensoryScores,
    setSensoryScores,
    runOutcome,
    setRunOutcome,
    stepLogs,
    setStepLogs,
    timerCompleted,
    setTimerCompleted,
    conditionalAnswers,
    setConditionalAnswers,
    failureReason,
    setFailureReason,

    // Computed
    phases,
    activePhase,
    activeStep,
    validation,

    // Actions
    handleStartRun,
    handleNext,
    handleFinishRun,
    handleSaveDraft,

    // Explicit API for UI if needed
    isDirty,
    setIsDirty,
  };
};
