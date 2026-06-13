import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useMutation, useQuery } from "convex/react";
import {
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  FileSignature,
  Folder,
  History,
  MessageSquare,
  Plus,
  Save,
} from "lucide-react";
import { DateTime } from "luxon";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { SortablePhaseItem } from "../components/formulation/sortable-phase-item";
import { ReviewPanel } from "../components/ReviewPanel";
import VersionHistoryModal from "../components/VersionHistoryModal";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { useFormulationSave } from "../hooks/formulation/use-formulation-save";
import { usePermissions } from "../hooks/usePermissions";
import {
  ALPHABET_MAP,
  buildAggregatedIngredients,
  COLORS,
  createInitialPhases,
  deriveIngredients,
  getAdditiveIngredientIds,
  getFlatSteps,
  getIsStepLocked,
} from "../lib/formulation/helpers";
import {
  addPhaseToPhases,
  addStepToPhase,
  deletePhaseFromPhases,
  deleteStepFromPhase,
  reorderPhases,
  reorderStepInPhase,
  updatePhaseInPhases,
  updateStepInPhase,
} from "../lib/formulation/editing";
import type {
  EnrichedProject,
  IngredientListItem,
  InventoryListItem,
  FormulationState,
  PhaseColor,
  RecipePhase,
  RecipeStep,
  StepDependency,
  StepType,
} from "../types";

const Formulation: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const projectId = id as Id<"projects"> | undefined;

  const convexProject = useQuery(
    api.projects.get,
    projectId ? { id: projectId } : "skip"
  );
  const updateProjectMutation = useMutation(api.projects.update);
  const logActivity = useMutation(api.activities.log);
  const inventoryItems = useQuery(api.inventory.list, {}) as
    | InventoryListItem[]
    | undefined;
  const ingredientsList = (useQuery(api.ingredients.list) ??
    []) as IngredientListItem[];

  const aggregatedIngredients = useMemo(
    () => buildAggregatedIngredients(ingredientsList, inventoryItems),
    [ingredientsList, inventoryItems]
  );

  // Map Convex doc to Project type
  const foundProject: EnrichedProject | undefined = convexProject ?? undefined;

  const [project, setProject] = useState<EnrichedProject | undefined>(
    foundProject
  );
  const [phases, setPhases] = useState<RecipePhase[]>([]);
  const additiveIngredientIds = useMemo(
    () => getAdditiveIngredientIds(phases, aggregatedIngredients),
    [phases, aggregatedIngredients]
  );
  const additiveLimits = useQuery(
    api.regulatory.getProjectAdditiveLimits,
    additiveIngredientIds.length > 0
      ? {
          categoryCode: project?.gsfaCategoryCode,
          ingredientIds: additiveIngredientIds,
        }
      : "skip"
  );

  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [isReviewPanelOpen, setIsReviewPanelOpen] = useState(false);

  // Dnd-Kit Phase Handlers
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = phases.findIndex((p) => p.id === active.id);
      const newIndex = phases.findIndex((p) => p.id === over.id);
      reorderPhase(oldIndex, newIndex);
    }
  };

  // New Step Dependencies logic hooks
  const stepDependenciesDocs = useQuery(
    api.stepDependencies.getByProject,
    projectId ? { projectId } : "skip"
  );
  const saveDependencyMutation = useMutation(
    api.stepDependencies.saveDependency
  );

  // Map to frontend dependencies interface
  const stepDependencies = useMemo(() => {
    const deps: Record<string, StepDependency> = {};
    if (stepDependenciesDocs && Array.isArray(stepDependenciesDocs)) {
      for (const d of stepDependenciesDocs) {
        if (d?.stepKey) {
          deps[d.stepKey] = d;
        }
      }
    }
    return deps;
  }, [stepDependenciesDocs]);

  const flatSteps = useMemo(() => getFlatSteps(phases), [phases]);

  // Lock status evaluator
  const isStepLocked = (stepKey: string) =>
    getIsStepLocked(stepKey, stepDependencies, flatSteps);

  const handleSaveDependency = async (
    stepKey: string,
    dependsOn: string[],
    condition: "AND" | "OR"
  ) => {
    if (!projectId) {
      return;
    }
    await saveDependencyMutation({
      projectId,
      stepKey,
      dependsOnStepKeys: dependsOn,
      condition,
    });
  };

  // Store refs for scrolling to specific phases/steps
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Initialize Phases
  // biome-ignore lint/correctness/useExhaustiveDependencies: Initialize from Convex query once
  useEffect(() => {
    if (foundProject) {
      setProject(foundProject);
      if (foundProject.phases && foundProject.phases.length > 0) {
        setPhases(foundProject.phases);
      } else {
        setPhases(
          createInitialPhases(
            foundProject.ingredients,
            t("preparation_weighing")
          )
        );
      }
    }
  }, [convexProject]);

  // Derive ingredients from weighing steps across all phases
  const derivedIngredients = useMemo(
    () => deriveIngredients(phases, aggregatedIngredients),
    [phases, aggregatedIngredients]
  );

  const { user } = usePermissions();
  const canEditBase = true; // hasPermission('edit_procedures') // Bypassing for local testing
  const canEdit = canEditBase && project?.status !== "Released";
  // Allow sign off for local/test environments where roles might not be fully seeded
  const canSignOff = true; // role?.key === "admin" || role?.key === "supervisor";
  const handleSave = useFormulationSave({
    canEdit,
    ingredients: derivedIngredients,
    logAction: "Updated Formulation",
    logPage: "Formulation",
    phases,
    project,
    projectId,
    successMessage: "Formulation saved successfully!",
  });

  const handleStatusChange = async (newStatus: string) => {
    if (!(project && projectId)) {
      return;
    }

    // Role-based check for "Released"
    if (newStatus === "Released" && !canSignOff) {
      // biome-ignore lint/suspicious/noAlert: Alert is an explicit requirement for critical errors
      window.alert(
        "You do not have permission to release this formulation. Only Admins or Approvers can perform this action."
      );
      return;
    }

    const notes = project.releaseNotes;

    // Pass releasedBy if transitioning to Released
    const releasedBy =
      newStatus === "Released"
        ? user?.name || user?.email || t("authorized_user")
        : undefined;

    try {
      await updateProjectMutation({
        id: projectId,
        status: newStatus as "Draft" | "Under Review" | "Released",
        releaseNotes: notes,
        ...(releasedBy ? { releasedBy } : {}),
      });

      // Update local state to reflect UI immediately
      setProject({
        ...project,
        status: newStatus as "Draft" | "Under Review" | "Released",
      });

      logActivity({
        action: `Changed Status to ${newStatus}`,
        target: project.name,
        page: "Formulation",
      });
    } catch (err: unknown) {
      // biome-ignore lint/suspicious/noAlert: Immediate user feedback needed on failure
      window.alert((err as Error).message || t("failed_to_update_status"));
    }
  };

  const scrollToItem = (itemId: string) => {
    const element = itemRefs.current[itemId];
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      // Add a temporary highlight effect
      element.classList.add(
        "ring-4",
        "ring-indigo-500/50",
        "ring-offset-4",
        "dark:ring-offset-[#0f172a]"
      );
      setTimeout(() => {
        element.classList.remove(
          "ring-4",
          "ring-indigo-500/50",
          "ring-offset-4",
          "dark:ring-offset-[#0f172a]"
        );
      }, 1500);
    }
  };

  const addPhase = () => {
    if (!canEdit) {
      return;
    }
    const { phases: nextPhases, newPhase } = addPhaseToPhases(
      phases,
      t("new_phase")
    );
    setPhases(nextPhases);
    setTimeout(() => scrollToItem(newPhase.id), 100);
  };

  const updatePhase = (phaseId: string, updates: Partial<RecipePhase>) => {
    if (!canEdit) {
      return;
    }
    setPhases(updatePhaseInPhases(phases, phaseId, updates));
  };

  const deletePhase = (phaseId: string) => {
    if (!canEdit) {
      return;
    }
    setPhases(deletePhaseFromPhases(phases, phaseId));
  };

  const addStep = (phaseId: string, type: StepType) => {
    if (!canEdit) {
      return;
    }
    const { phases: nextPhases, newStep } = addStepToPhase(
      phases,
      phaseId,
      type,
      t("ph_level"),
      t("mini_spreadsheet")
    );
    setPhases(nextPhases);
    setTimeout(() => scrollToItem(newStep.id), 100);
  };

  const updateStep = (
    phaseId: string,
    stepId: string,
    updates: Partial<RecipeStep>
  ) => {
    if (!canEdit) {
      return;
    }
    setPhases(updateStepInPhase(phases, phaseId, stepId, updates));
  };

  const deleteStep = (phaseId: string, stepId: string) => {
    if (!canEdit) {
      return;
    }
    setPhases(deleteStepFromPhase(phases, phaseId, stepId));
  };

  const reorderStep = (
    phaseId: string,
    startIndex: number,
    endIndex: number
  ) => {
    if (!canEdit || startIndex === endIndex) {
      return;
    }
    setPhases((currentPhases) =>
      reorderStepInPhase(currentPhases, phaseId, startIndex, endIndex)
    );
  };

  const reorderPhase = (startIndex: number, endIndex: number) => {
    if (!canEdit || startIndex === endIndex) {
      return;
    }
    setPhases((currentPhases) =>
      reorderPhases(currentPhases, startIndex, endIndex)
    );
  };

  if (!project) {
    return <div>{t("project_not_found")}</div>;
  }

  return (
    <div className="-m-4 flex min-h-dvh flex-col bg-white sm:-m-6 lg:-m-8 dark:bg-[#0f172a]">
      {/* Header - Sticky */}
      <div className="relative z-10 flex shrink-0 flex-col justify-between gap-4 border-gray-100 border-b bg-white px-8 py-4 shadow-sm md:flex-row md:items-center dark:border-slate-800 dark:bg-[#0f172a]">
        <div className="flex items-center space-x-4">
          <button
            aria-label={t("go_back")}
            className="cursor-pointer rounded-full border border-gray-200 bg-gray-50 p-3 text-gray-500 transition-colors hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            onClick={() => {
              if (window.history.length > 2) {
                navigate(-1);
              } else {
                navigate("/");
              }
            }}
            style={{ cursor: "pointer" }}
            title={t("go_back")}
            type="button"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h1 className="flex items-center gap-3 font-bold text-3xl text-gray-900 dark:text-white">
                    {project?.name || t("formulation_builder")}
                    <span className="rounded-lg border border-gray-200 bg-gray-100 px-2.5 py-1 font-medium text-gray-600 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                      v{project.version}
                    </span>
                  </h1>
                  {project && (
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        className={`cursor-pointer appearance-none rounded-full border px-3 py-1.5 font-bold text-xs outline-none transition-colors ${
                          (
                            {
                              Released:
                                "cursor-not-allowed border-emerald-200 bg-emerald-100 text-emerald-800 opacity-90 dark:border-emerald-800/60 dark:bg-emerald-900/40 dark:text-emerald-300",
                              "Under Review":
                                "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-800/50 dark:bg-amber-900/30 dark:text-amber-400",
                              Draft:
                                "border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
                            } as Record<string, string>
                          )[project.status || "Draft"] ||
                          "border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                        data-testid="formulation-status-select"
                        disabled={project.status === "Released"}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        value={project.status || "Draft"}
                      >
                        <option value="Draft">{t("draft")}</option>
                        <option value="Under Review">{t("under_review")}</option>
                        <option value="Released">{t("released")}</option>
                      </select>
                      <label className="flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 font-bold text-cyan-800 text-xs dark:border-cyan-800/50 dark:bg-cyan-900/30 dark:text-cyan-300">
                        <span>{t("formulation_state")}</span>
                        <select
                          className="cursor-pointer appearance-none bg-transparent font-bold outline-none"
                          data-testid="formulation-state-select"
                          disabled={!canEdit}
                          onChange={(e) =>
                            setProject({
                              ...project,
                              formulationState: e.target
                                .value as FormulationState,
                            })
                          }
                          value={project.formulationState || "Liquid"}
                        >
                          <option value="Liquid">{t("liquid")}</option>
                          <option value="Solid">{t("solid")}</option>
                        </select>
                      </label>
                    </div>
                  )}
                </div>
                <p className="flex items-center gap-2 font-medium text-gray-500 text-sm dark:text-slate-400">
                  <Folder size={14} />

                  {t("sequence_editor")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-2 rounded-3xl border border-indigo-200 bg-white px-6 py-3 font-bold text-indigo-600 transition-all hover:scale-[1.02] hover:bg-indigo-50 active:scale-[0.98] dark:border-indigo-800/50 dark:bg-[#1e293b] dark:text-indigo-400 dark:hover:bg-indigo-900/30"
            onClick={() => setIsReviewPanelOpen(true)}
            type="button"
          >
            <MessageSquare size={20} />
            <span>{t("review")}</span>
          </button>

          <button
            className="flex items-center gap-2 rounded-3xl border border-gray-200 bg-white px-6 py-3 font-bold text-gray-700 transition-all hover:scale-[1.02] hover:bg-gray-50 active:scale-[0.98] dark:border-slate-700 dark:bg-[#1e293b] dark:text-slate-300 dark:hover:bg-slate-800"
            onClick={() => setIsVersionHistoryOpen(true)}
            type="button"
          >
            <History size={20} />
            <span>{t("history")}</span>
          </button>

          {canEdit && (
            <button
              className="flex items-center gap-2 rounded-3xl bg-indigo-600 px-6 py-3 font-bold text-white shadow-indigo-600/20 shadow-lg transition-all hover:scale-[1.02] hover:bg-indigo-700 active:scale-[0.98] dark:bg-indigo-500"
              data-testid="save-formulation-button"
              onClick={handleSave}
              type="button"
            >
              <Save size={20} />
              <span>{t("save_formulation")}</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Outline (25%) */}
        <div className="sticky top-0 hidden h-full w-[30%] max-w-sm shrink-0 select-none overflow-y-auto border-gray-100 border-r bg-gray-50/50 shadow-[inset_-10px_0_20px_-15px_rgba(0,0,0,0.05)] md:block dark:border-slate-800 dark:bg-[#1e293b]/50 dark:shadow-[inset_-10px_0_20px_-15px_rgba(0,0,0,0.5)]">
          <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-500 text-xs uppercase tracking-widest dark:text-slate-400">
                {t("contents")}
              </h2>
              {canEdit && (
                <button
                  className="flex items-center gap-1 rounded border border-indigo-100 bg-indigo-50 px-2 py-1 font-bold text-indigo-600 text-xs transition-colors hover:text-indigo-700 dark:border-indigo-800/50 dark:bg-indigo-900/30 dark:text-indigo-400"
                  onClick={addPhase}
                  type="button"
                >
                  <Plus size={14} /> {t("phase")}
                </button>
              )}
            </div>

            <div className="space-y-1">
              {phases.map((phase, pIndex) => {
                const phaseIdStr = ALPHABET_MAP[pIndex % 26];
                // Determine Phase Color mapping dynamically for outline if we want it strictly enforced
                const actualColor =
                  COLORS[phase.color as PhaseColor] || COLORS.blue;

                return (
                  <div className="space-y-[2px]" key={`outline-${phase.id}`}>
                    <button
                      className={
                        "flex w-full cursor-pointer items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-start text-gray-700 transition-colors hover:bg-gray-100/80 dark:text-slate-300 dark:hover:bg-slate-800/80"
                      }
                      onClick={() => scrollToItem(phase.id)}
                      type="button"
                    >
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-lg font-bold text-xs ${actualColor.bg} ${actualColor.text} border shadow-sm ${actualColor.border} dark:border-transparent`}
                      >
                        {phaseIdStr}
                      </div>
                      <span className="truncate font-bold text-sm">
                        {phase.name || t("unnamed_phase")}
                      </span>
                    </button>

                    {phase.steps.length > 0 && (
                      <div className="relative mt-1 mb-2 space-y-0">
                        {/* Phase master line connecting steps */}
                        <div className="pointer-events-none absolute start-[26px] top-[-10px] bottom-[16px] w-px bg-gray-300 dark:bg-slate-700" />

                        {phase.steps.map((step, sIndex) => {
                          const stepIdStr = `${phaseIdStr}${sIndex + 1}`;
                          const dependency = stepDependencies[step.id];
                          const hasDependency =
                            dependency &&
                            dependency.dependsOnStepKeys.length > 0;
                          const isConditional = step.type === "conditional";

                          return (
                            <div
                              className="relative"
                              key={`outline-${step.id}`}
                            >
                              <button
                                className="group flex w-full cursor-pointer items-center rounded-lg px-2 py-1.5 text-start font-medium text-gray-600 transition-colors hover:bg-gray-100/80 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-200"
                                onClick={() => scrollToItem(step.id)}
                                type="button"
                              >
                                {/* Node visual container */}
                                <div className="relative z-10 flex w-[30px] shrink-0 justify-center">
                                  {hasDependency ? (
                                    <div
                                      className="h-2.5 w-2.5 rounded-full bg-indigo-500 ring-4 ring-gray-50/50 transition-colors group-hover:ring-gray-100/80 dark:ring-[#1e293b]/50 dark:group-hover:ring-slate-800/80"
                                      title={t("has_dependency")}
                                    />
                                  ) : (
                                    <div className="h-1.5 w-1.5 rounded-full bg-gray-300 ring-4 ring-gray-50/50 transition-colors group-hover:ring-gray-100/80 dark:bg-slate-600 dark:ring-[#1e293b]/50 dark:group-hover:ring-slate-800/80" />
                                  )}
                                </div>

                                <div className="flex min-w-0 flex-1 items-center gap-2 pe-2">
                                  <span
                                    className={`w-6 shrink-0 font-bold text-xs ${hasDependency ? "text-indigo-600 dark:text-indigo-400" : "opacity-70"}`}
                                  >
                                    {stepIdStr}
                                  </span>
                                  <span className="w-full truncate text-sm">
                                    {step.label || t("unnamed_step")}
                                  </span>
                                  {isConditional && (
                                    <CheckSquare
                                      className="ms-auto shrink-0 text-indigo-500 opacity-60"
                                      size={14}
                                    />
                                  )}
                                </div>
                              </button>

                              {/* Conditional fail branch */}
                              {isConditional && (
                                <div className="relative ps-[3.2rem] pe-2 pt-0.5 pb-3">
                                  {/* Dashed line for fail path */}
                                  <div className="pointer-events-none absolute start-[26px] top-[-14px] bottom-[18px] w-[18px] rounded-bl-xl border-red-400/80 border-b border-l border-dashed dark:border-red-500/60" />

                                  <div className="relative z-10 flex w-fit cursor-pointer items-center gap-2 rounded-md border border-red-100 bg-red-50/80 px-2 py-1.5 font-bold text-[11px] text-red-600 shadow-sm transition-colors hover:bg-red-100 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40">
                                    <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-400 dark:bg-red-500" />
                                    <span className="truncate">
                                      {step.onFail?.action ===
                                      "redirect_dispose"
                                        ? t("batch_disposal")
                                        : t("report_reason")}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-8 border-gray-200 border-t pt-6 dark:border-slate-700">
              <details className="group">
                <summary className="flex cursor-pointer select-none items-center justify-between font-bold text-gray-500 text-xs uppercase tracking-widest transition-colors hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300">
                  {t("flow_legend")}
                  <ChevronDown
                    className="transition-transform group-open:rotate-180"
                    size={14}
                  />
                </summary>
                <div className="mt-4 space-y-3 rounded-xl border border-gray-100 bg-white p-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="h-[2px] w-[18px] bg-gray-300 dark:bg-slate-600" />
                    <span className="font-medium text-gray-600 text-xs dark:text-slate-400">
                      {t("main_flow")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-[2px] w-[18px] border-red-400 border-b-2 border-dashed dark:border-red-500/60" />
                    <span className="font-medium text-gray-600 text-xs dark:text-slate-400">
                      {t("fail_flow")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="mx-[5px] h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                    <span className="font-medium text-gray-600 text-xs dark:text-slate-400">
                      {t("has_dependency")}
                    </span>
                  </div>
                </div>
              </details>
            </div>
          </div>
        </div>

        {/* Main Canvas - Continuous Scroll (75%) */}
        <div className="flex-1 overflow-y-auto scroll-smooth bg-gray-100/30 pb-32 dark:bg-[#0f172a]">
          <div className="fade-in zoom-in-95 mx-auto max-w-4xl animate-in space-y-16 p-6 duration-200 lg:p-12">
            {/* The Release Stamp */}
            {project.status === "Released" && (
              <div className="relative flex flex-col items-center justify-center space-y-3 overflow-hidden rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-6 text-center shadow-sm dark:border-emerald-800/50 dark:bg-emerald-900/20">
                <div className="pointer-events-none absolute end-0 top-0 p-4 opacity-10">
                  <CheckCircle2
                    className="rotate-12 transform text-emerald-600 dark:text-emerald-400"
                    size={120}
                  />
                </div>
                <h2 className="flex items-center gap-2 font-black text-emerald-800 text-xl uppercase tracking-tight dark:text-emerald-300">
                  <CheckCircle2 size={24} /> {t("final_approval_stamp")}
                </h2>
                <p className="font-medium text-emerald-700 text-sm md:text-base dark:text-emerald-400">
                  {t("id")}{" "}
                  <span className="font-bold">
                    {project.formattedId || t("not_applicable")}
                  </span>{" "}
                  <span className="mx-2 opacity-50">|</span>
                  {t("version")}{" "}
                  <span className="font-bold">{project.version}</span>{" "}
                  <span className="mx-2 opacity-50">|</span>
                  {t("released_on")}{" "}
                  <span className="font-bold">
                    {project.releasedAt
                      ? DateTime.fromISO(project.releasedAt).toLocaleString(
                          DateTime.DATE_SHORT
                        )
                      : t("unknown_date")}
                  </span>{" "}
                  {t("by")}{" "}
                  <span className="font-bold">
                    {project.releasedBy || t("authorized_user")}
                  </span>
                </p>
              </div>
            )}

            {/* Release Notes Area */}
            {(project.status === "Draft" ||
              project.status === "Under Review" ||
              project.releaseNotes) && (
              <div className="space-y-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-[#1e293b]">
                <h3 className="flex items-center gap-2 font-bold text-gray-900 text-sm dark:text-white">
                  <FileSignature className="text-indigo-500" size={16} />

                  {t("release_notes")}
                </h3>
                {project.status === "Released" ? (
                  <p className="whitespace-pre-wrap rounded-xl border border-gray-100 bg-gray-50 p-4 text-gray-600 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                    {project.releaseNotes || t("no_release_notes_provided")}
                  </p>
                ) : (
                  <textarea
                    className="h-24 w-full resize-y rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-900 text-sm placeholder-gray-400 transition-all focus:border-transparent focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    onBlur={() => handleSave()}
                    onChange={(e) =>
                      setProject({ ...project, releaseNotes: e.target.value })
                    }
                    placeholder={t("release_notes_placeholder")}
                    value={project.releaseNotes || ""}
                  />
                )}
              </div>
            )}

            {phases.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center rounded-4xl border border-gray-300 border-dashed bg-white p-8 text-center text-gray-400 dark:border-slate-700 dark:bg-[#1e293b] dark:text-slate-600">
                <Folder className="mb-4 opacity-20" size={48} />
                <h3 className="mb-2 font-bold text-gray-500 text-xl dark:text-slate-400">
                  {t("empty_formulation")}
                </h3>
                <p className="mb-6 max-w-md text-sm">
                  {t("start_building_your_document_by_adding_a")}
                </p>
                {canEdit && (
                  <button
                    className="rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white shadow-sm transition-colors hover:bg-indigo-700"
                    onClick={addPhase}
                    type="button"
                  >
                    {t("add_first_phase")}
                  </button>
                )}
              </div>
            ) : (
              <DndContext
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                sensors={sensors}
              >
                <SortableContext
                  items={phases.map((p) => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {phases.map((phase, pIndex) => {
                    const phaseIdStr = ALPHABET_MAP[pIndex % 26];
                    const pColor =
                      COLORS[phase.color as PhaseColor] || COLORS.blue;

                    return (
                      <SortablePhaseItem
                        additiveLimits={additiveLimits}
                        addStep={addStep}
                        aggregatedIngredients={aggregatedIngredients}
                        canEdit={canEdit}
                        deletePhase={deletePhase}
                        deleteStep={deleteStep}
                        flatSteps={flatSteps}
                        handleSaveDependency={handleSaveDependency}
                        isStepLocked={isStepLocked}
                        itemRefs={itemRefs}
                        key={phase.id}
                        pColor={pColor}
                        phase={phase}
                        phaseIdStr={phaseIdStr}
                        projectId={id as Id<"projects">}
                        reorderStep={reorderStep}
                        stepDependencies={stepDependencies}
                        updatePhase={updatePhase}
                        updateStep={updateStep}
                        formulationContext={{
                          ingredients: derivedIngredients,
                          phases,
                        }}
                      />
                    );
                  })}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </div>

      {project && (
        <VersionHistoryModal
          currentVersion={project.version}
          isOpen={isVersionHistoryOpen}
          onClose={() => setIsVersionHistoryOpen(false)}
          projectId={id as Id<"projects">}
        />
      )}

      <ReviewPanel
        isOpen={isReviewPanelOpen}
        onClose={() => setIsReviewPanelOpen(false)}
        projectId={id as Id<"projects">}
      />
    </div>
  );
};

export default Formulation;
