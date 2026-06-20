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
  ShieldAlert,
  X,
} from "lucide-react";
import { DateTime } from "luxon";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import {
  ALLERGEN_LISTS,
  TREE_NUT_OPTIONS,
} from "../components/add-ingredient/constants";
import type { AllergenRegion } from "../components/add-ingredient/types";
import { SortablePhaseItem } from "../components/formulation/sortable-phase-item";
import { ReviewPanel } from "../components/ReviewPanel";
import VersionHistoryModal from "../components/VersionHistoryModal";
import { useSettings } from "../context/SettingsContext";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { usePermissions } from "../hooks/usePermissions";
import {
  addPhaseToPhases,
  addStepAfterStepInPhase,
  addStepToPhase,
  deletePhaseFromPhases,
  deleteStepFromPhase,
  reorderPhases,
  reorderStepInPhase,
  updatePhaseInPhases,
  updateStepInPhase,
} from "../lib/formulation/editing";
import {
  ALPHABET_MAP,
  applyAllergenOverrides,
  areAllergenOverridesEqual,
  areStringSelectionsEqual,
  buildAggregatedIngredients,
  COLORS,
  calculateNutritionFacts,
  calculateRegulationCompliance,
  createInitialPhases,
  deriveIngredients,
  getAdditiveIngredientIds,
  getFlatSteps,
  getFormulationBaselineAllergens,
  getIsStepLocked,
} from "../lib/formulation/helpers";
import {
  buildFormulationSavePayload,
  calculatePackagingCosts,
  calculateProjectRDCost,
  calculateRecipeCosts,
  calculateRecipeMeasures,
  isServingOverPackagingCapacity,
  type ServingSizeUnit,
} from "../lib/formulation/save-payload";
import type {
  EnrichedProject,
  FormulationState,
  InventoryListItem,
  PhaseColor,
  RecipePhase,
  RecipeStep,
  ServingSizeMode,
  StepDependency,
  StepType,
} from "../types";

const PACKAGING_OPTIONS = [
  { name: "", unitPrice: 0, capacity: undefined },
  { name: "100g Plastic Cup", unitPrice: 0.05, capacity: 100 },
  { name: "150g Plastic Cup", unitPrice: 0.07, capacity: 150 },
  { name: "250g Glass Jar", unitPrice: 0.22, capacity: 250 },
  { name: "Foil Lid", unitPrice: 0.03, capacity: undefined },
  { name: "Custom Packaging", unitPrice: 0, capacity: undefined },
] satisfies Array<{
  capacity?: number;
  name: string;
  unitPrice: number;
}>;

const SERVING_SIZE_UNITS = ["g", "kg", "mg", "ml"] as const;
const MULTIPLE_AUTOSAVE_NAME =
  "Auto-Save: Updated multiple formulation fields";
const DEFAULT_AUTOSAVE_NAME = "Auto-Save: Updated formulation fields";

function formatAutosaveValue(value: string | number | undefined) {
  if (value === undefined || value === "") {
    return "blank";
  }
  return String(value);
}

const Formulation: React.FC = () => {
  const { t } = useTranslation();
  const { language } = useSettings();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const projectId = id as Id<"projects"> | undefined;

  const convexProject = useQuery(
    api.projects.get,
    projectId ? { id: projectId, language } : "skip"
  );
  const updateProjectMutation = useMutation(api.projects.update);
  const createNewVersionMutation = useMutation(api.projects.createNewVersion);
  const logActivity = useMutation(api.activities.log);
  const inventoryItems = useQuery(api.inventory.list, { language }) as
    | InventoryListItem[]
    | undefined;
  const formulationIngredientOptions =
    useQuery(api.ingredients.listFormulationOptions, { language }) ?? [];

  const aggregatedIngredients = useMemo(
    () =>
      buildAggregatedIngredients(formulationIngredientOptions, inventoryItems),
    [formulationIngredientOptions, inventoryItems]
  );

  // Map Convex doc to Project type
  const foundProject: EnrichedProject | undefined =
    convexProject && convexProject._id === projectId
      ? convexProject
      : undefined;

  const [project, setProject] = useState<EnrichedProject | undefined>(
    foundProject
  );
  const [phases, setPhases] = useState<RecipePhase[]>([]);
  const [extraAllergenInput, setExtraAllergenInput] = useState("");
  const [manualAllergenOverrides, setManualAllergenOverrides] = useState<
    Record<string, boolean>
  >({});
  const allergenOverridesInitializedFor = useRef<string | null>(null);
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
  const [isCreatingNewVersion, setIsCreatingNewVersion] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const loadedProjectIdRef = useRef<string | null>(null);
  const lastAutosaveSignatureRef = useRef("");
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveRunRef = useRef(0);
  const pendingAutosaveChangesRef = useRef<Map<string, string>>(new Map());

  const queueAutosaveChange = useCallback((key: string, description: string) => {
    pendingAutosaveChangesRef.current.set(key, description);
  }, []);

  const getPendingAutosaveName = useCallback(() => {
    const descriptions = [...pendingAutosaveChangesRef.current.values()];
    if (descriptions.length === 0) {
      return DEFAULT_AUTOSAVE_NAME;
    }
    if (descriptions.length === 1) {
      return descriptions[0];
    }
    return MULTIPLE_AUTOSAVE_NAME;
  }, []);

  const resetEditorState = useCallback(() => {
    setProject(undefined);
    setPhases([]);
    setExtraAllergenInput("");
    setManualAllergenOverrides({});
    allergenOverridesInitializedFor.current = null;
    loadedProjectIdRef.current = null;
    lastAutosaveSignatureRef.current = "";
    pendingAutosaveChangesRef.current.clear();
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    setAutosaveStatus("idle");
    setIsVersionHistoryOpen(false);
    setIsReviewPanelOpen(false);
    setIsCreatingNewVersion(false);
  }, []);

  useEffect(() => {
    resetEditorState();
  }, [projectId, resetEditorState]);

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

  const handleServingAmountChange = (value: string) => {
    if (!project) {
      return;
    }
    queueAutosaveChange(
      "measures.servingSizeAmount",
      servingSizeMode === "recipeMakes"
        ? `Auto-Save: Updated serving count to ${formatAutosaveValue(value)}`
        : `Auto-Save: Updated serving size to ${formatAutosaveValue(value)}${servingSizeUnit}`
    );
    setProject({
      ...project,
      servingSizeAmount: value === "" ? undefined : Number(value),
    });
  };

  const handleServingSizeUnitChange = (servingSizeUnit: ServingSizeUnit) => {
    if (!project) {
      return;
    }
    queueAutosaveChange(
      "measures.servingSizeUnit",
      `Auto-Save: Updated serving size unit to ${servingSizeUnit}`
    );
    setProject({
      ...project,
      servingSizeUnit,
    });
  };

  const handleFormulationStateChange = (formulationState: FormulationState) => {
    if (!project) {
      return;
    }
    queueAutosaveChange(
      "measures.formulationState",
      `Auto-Save: Switched formulation state to ${formulationState}`
    );
    setProject({
      ...project,
      formulationState,
    });
  };

  const handleServingSizeModeChange = (servingSizeMode: ServingSizeMode) => {
    if (!project) {
      return;
    }
    queueAutosaveChange(
      "measures.servingSizeMode",
      `Auto-Save: Switched serving size mode to ${
        servingSizeMode === "recipeMakes"
          ? "A Recipe makes"
          : "A Serving is"
      }`
    );
    setProject({
      ...project,
      servingSizeMode,
    });
  };

  const handlePackagingSelectionChange = (packagingItemName: string) => {
    if (!project) {
      return;
    }
    const option = PACKAGING_OPTIONS.find(
      (item) => item.name === packagingItemName
    );
    queueAutosaveChange(
      "packaging.item",
      `Auto-Save: Updated packaging item to ${packagingItemName || "none"}`
    );
    setProject({
      ...project,
      packagingItemName,
      packagingUnitPrice: option?.unitPrice ?? project.packagingUnitPrice,
      packagingCapacity: option?.capacity,
      packagingCapacityUnit: option?.capacity
        ? "g"
        : project.packagingCapacityUnit,
    });
  };

  const handlePackagingNumberChange = (
    field: "packagingUnitPrice" | "packagingCapacity",
    value: string
  ) => {
    if (!project) {
      return;
    }
    queueAutosaveChange(
      `packaging.${field}`,
      field === "packagingUnitPrice"
        ? `Auto-Save: Updated packaging unit price to $${formatAutosaveValue(value)}`
        : `Auto-Save: Updated packaging capacity to ${formatAutosaveValue(value)}g`
    );
    setProject({
      ...project,
      [field]: value === "" ? undefined : Number(value),
      ...(field === "packagingCapacity" && value !== ""
        ? { packagingCapacityUnit: "g" }
        : {}),
    });
  };

  const markAllergenReviewRequired = () => {
    setProject((currentProject) => {
      if (!currentProject) {
        return currentProject;
      }
      return {
        ...currentProject,
        allergenReviewRequired: true,
      };
    });
  };

  const toggleFormulationAllergen = (allergenKey: string) => {
    if (!(project && canEdit)) {
      return;
    }
    const currentChecked = selectedFormulationAllergens.includes(allergenKey);
    const nextChecked = !currentChecked;
    const baselineChecked = baselineAllergens.includes(allergenKey);
    queueAutosaveChange(
      `allergens.${allergenKey}`,
      `Auto-Save: ${nextChecked ? "Selected" : "Cleared"} allergen ${allergenKey.replace(/^allergen_/, "").replace(/_/g, " ")}`
    );
    setManualAllergenOverrides((currentOverrides) => {
      const nextOverrides = { ...currentOverrides };
      if (nextChecked === baselineChecked) {
        delete nextOverrides[allergenKey];
      } else {
        nextOverrides[allergenKey] = nextChecked;
      }
      return nextOverrides;
    });
    setProject({
      ...project,
      allergenReviewRequired: true,
    });
  };

  const addExtraAllergen = () => {
    if (!(project && canEdit)) {
      return;
    }
    const value = extraAllergenInput.trim();
    if (!value) {
      return;
    }
    const currentExtras = project.formulationExtraAllergens ?? [];
    if (currentExtras.includes(value)) {
      setExtraAllergenInput("");
      return;
    }
    queueAutosaveChange(
      "allergens.extra",
      `Auto-Save: Added extra allergen ${value}`
    );
    setProject({
      ...project,
      formulationExtraAllergens: [...currentExtras, value],
      allergenReviewRequired: true,
    });
    setExtraAllergenInput("");
  };

  const removeExtraAllergen = (value: string) => {
    if (!(project && canEdit)) {
      return;
    }
    queueAutosaveChange(
      "allergens.extra",
      `Auto-Save: Removed extra allergen ${value}`
    );
    setProject({
      ...project,
      formulationExtraAllergens: (
        project.formulationExtraAllergens ?? []
      ).filter((allergen) => allergen !== value),
      allergenReviewRequired: true,
    });
  };

  const verifyFormulationAllergens = async () => {
    if (!(project && projectId && canEdit)) {
      return;
    }
    const nextProject = {
      ...project,
      allergenReviewRequired: false,
      formulationAllergens: selectedFormulationAllergens,
      formulationAllergenOverrides: manualAllergenOverrides,
      formulationExtraAllergens: extraFormulationAllergens,
    };
    setProject(nextProject);
    await updateProjectMutation({
      id: projectId,
      allergenRegion,
      allergenReviewRequired: false,
      formulationAllergens: selectedFormulationAllergens,
      formulationAllergenOverrides: manualAllergenOverrides,
      formulationExtraAllergens: extraFormulationAllergens,
    });
  };

  const handleAllergenRegionChange = (allergenRegion: string) => {
    if (!project) {
      return;
    }
    queueAutosaveChange(
      "label.regulation",
      `Auto-Save: Switched label regulation to ${allergenRegion}`
    );
    setProject({
      ...project,
      allergenRegion,
      allergenReviewRequired: true,
    });
  };

  // Store refs for scrolling to specific phases/steps
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Initialize Phases
  // biome-ignore lint/correctness/useExhaustiveDependencies: Initialize from Convex query once
  useEffect(() => {
    if (foundProject && loadedProjectIdRef.current !== foundProject._id) {
      loadedProjectIdRef.current = foundProject._id;
      lastAutosaveSignatureRef.current = "";
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
  const calculatedBatchWeight = useMemo(
    () =>
      Number(
        derivedIngredients
          .reduce((total, ingredient) => total + ingredient.weight, 0)
          .toFixed(6)
      ),
    [derivedIngredients]
  );
  const servingSizeMode = project?.servingSizeMode ?? "recipeMakes";
  const servingSizeAmount = project?.servingSizeAmount ?? project?.yield;
  const servingSizeUnit = (project?.servingSizeUnit ?? "g") as ServingSizeUnit;
  const calculatedMeasures = useMemo(
    () =>
      calculateRecipeMeasures(
        calculatedBatchWeight,
        servingSizeMode,
        servingSizeAmount,
        servingSizeUnit
      ),
    [calculatedBatchWeight, servingSizeAmount, servingSizeMode, servingSizeUnit]
  );
  const nutritionFacts = useMemo(
    () =>
      calculateNutritionFacts(
        derivedIngredients,
        calculatedMeasures.servingSizeWeight,
        calculatedBatchWeight
      ),
    [
      calculatedBatchWeight,
      calculatedMeasures.servingSizeWeight,
      derivedIngredients,
    ]
  );
  const ingredientStatement = derivedIngredients
    .map((ingredient) => ingredient.name)
    .filter(Boolean)
    .join(", ");
  const calculatedCosts = useMemo(
    () =>
      calculateRecipeCosts(derivedIngredients, calculatedMeasures.servingCount),
    [calculatedMeasures.servingCount, derivedIngredients]
  );
  const calculatedPackagingCosts = useMemo(
    () =>
      calculatePackagingCosts({
        costPerServing: calculatedCosts.costPerServing,
        packagingUnitPrice: project?.packagingUnitPrice,
      }),
    [calculatedCosts.costPerServing, project?.packagingUnitPrice]
  );
  const servingExceedsPackagingCapacity = isServingOverPackagingCapacity({
    packagingCapacity: project?.packagingCapacity,
    servingSizeWeight: calculatedMeasures.servingSizeWeight,
  });
  const regulationBreaches = useMemo(
    () =>
      phases.flatMap((phase) =>
        phase.steps.flatMap((step) => {
          if (step.type !== "weighing" || !step.ingredientId) {
            return [];
          }
          const ingredient = aggregatedIngredients.find(
            (item) => item._id === step.ingredientId
          );
          const additiveLimit = ingredient && additiveLimits?.[ingredient._id];
          const compliance = calculateRegulationCompliance({
            additiveLimit:
              additiveLimit && typeof additiveLimit === "object"
                ? additiveLimit
                : undefined,
            batchWeight: calculatedBatchWeight,
            maxLimitPercent: step.maxLimitPercent,
            weight: step.expectedWeight || 0,
          });
          return compliance.exceedsLimit
            ? [
                {
                  actualPercent: compliance.actualPercent,
                  ingredientName: ingredient?.name || step.label,
                  maxLimitPercent: compliance.effectiveMaxLimitPercent,
                  phaseName: phase.name,
                  stepId: step.id,
                },
              ]
            : [];
        })
      ),
    [additiveLimits, aggregatedIngredients, calculatedBatchWeight, phases]
  );
  const hasRegulationBreaches = regulationBreaches.length > 0;
  const totalProjectRDCost = calculateProjectRDCost(
    project?.totalProjectRDCost,
    project?.batchCost,
    calculatedCosts.batchCost
  );
  const baselineAllergens = useMemo(
    () =>
      getFormulationBaselineAllergens(
        derivedIngredients,
        aggregatedIngredients,
        TREE_NUT_OPTIONS
      ),
    [aggregatedIngredients, derivedIngredients]
  );
  const allergenRegion = (project?.allergenRegion || "FDA") as AllergenRegion;
  const selectedFormulationAllergens = useMemo(
    () => applyAllergenOverrides(baselineAllergens, manualAllergenOverrides),
    [baselineAllergens, manualAllergenOverrides]
  );
  const extraFormulationAllergens = project?.formulationExtraAllergens ?? [];

  useEffect(() => {
    if (!project) {
      return;
    }
    if (allergenOverridesInitializedFor.current === project._id) {
      return;
    }
    setManualAllergenOverrides(project.formulationAllergenOverrides ?? {});
    allergenOverridesInitializedFor.current = project._id;
  }, [project]);

  useEffect(() => {
    setProject((currentProject) => {
      if (!currentProject) {
        return currentProject;
      }
      const currentAllergens = currentProject.formulationAllergens ?? [];
      const currentOverrides =
        currentProject.formulationAllergenOverrides ?? {};
      const allergensMatch = areStringSelectionsEqual(
        currentAllergens,
        selectedFormulationAllergens
      );
      const overridesMatch = areAllergenOverridesEqual(
        currentOverrides,
        manualAllergenOverrides
      );
      if (allergensMatch && overridesMatch) {
        return currentProject;
      }
      return {
        ...currentProject,
        formulationAllergens: selectedFormulationAllergens,
        formulationAllergenOverrides: manualAllergenOverrides,
      };
    });
  }, [manualAllergenOverrides, selectedFormulationAllergens]);

  const { user } = usePermissions();
  const canEditBase = true; // hasPermission('edit_procedures') // Bypassing for local testing
  const lifecycleStatus = (
    ["Draft", "Under Review", "Released"].includes(project?.status ?? "")
      ? project?.status
      : "Draft"
  ) as "Draft" | "Under Review" | "Released";
  const isReleased = lifecycleStatus === "Released";
  const canEdit = canEditBase && !isReleased;
  // Allow sign off for local/test environments where roles might not be fully seeded
  const canSignOff = true; // role?.key === "admin" || role?.key === "supervisor";
  const autosavePayload = useMemo(
    () =>
      project
        ? buildFormulationSavePayload(project, phases, derivedIngredients)
        : undefined,
    [derivedIngredients, phases, project]
  );
  const autosaveSignature = useMemo(
    () => (autosavePayload ? JSON.stringify(autosavePayload) : ""),
    [autosavePayload]
  );

  useEffect(() => {
    if (!(project && projectId && canEdit && autosavePayload)) {
      return;
    }

    if (!lastAutosaveSignatureRef.current) {
      lastAutosaveSignatureRef.current = autosaveSignature;
      setAutosaveStatus("saved");
      return;
    }

    if (lastAutosaveSignatureRef.current === autosaveSignature) {
      return;
    }

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    setAutosaveStatus("saving");
    const runId = autosaveRunRef.current + 1;
    autosaveRunRef.current = runId;
    autosaveTimerRef.current = setTimeout(() => {
      const autosaveName = getPendingAutosaveName();
      updateProjectMutation({
        id: projectId,
        ...autosavePayload,
        autosaveName,
      })
        .then(() => {
          if (autosaveRunRef.current === runId) {
            lastAutosaveSignatureRef.current = autosaveSignature;
            pendingAutosaveChangesRef.current.clear();
            setAutosaveStatus("saved");
          }
        })
        .catch((error) => {
          console.error(error);
          if (autosaveRunRef.current === runId) {
            setAutosaveStatus("error");
          }
        });
    }, 500);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [
    autosavePayload,
    autosaveSignature,
    canEdit,
    getPendingAutosaveName,
    project,
    projectId,
    updateProjectMutation,
  ]);

  const handleExitEditor = useCallback(async () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    const hasPendingAutosave =
      Boolean(projectId && canEdit && autosavePayload) &&
      lastAutosaveSignatureRef.current !== autosaveSignature;

    if (hasPendingAutosave && projectId && autosavePayload) {
      const runId = autosaveRunRef.current + 1;
      autosaveRunRef.current = runId;
      const autosaveName = getPendingAutosaveName();
      setAutosaveStatus("saving");

      try {
        await updateProjectMutation({
          id: projectId,
          ...autosavePayload,
          autosaveName,
        });
        if (autosaveRunRef.current === runId) {
          lastAutosaveSignatureRef.current = autosaveSignature;
          pendingAutosaveChangesRef.current.clear();
          setAutosaveStatus("saved");
        }
      } catch (error) {
        console.error(error);
        if (autosaveRunRef.current === runId) {
          setAutosaveStatus("error");
        }
      }
    }

    autosaveRunRef.current += 1;
    resetEditorState();
    navigate("/", { replace: true });
  }, [
    autosavePayload,
    autosaveSignature,
    canEdit,
    getPendingAutosaveName,
    navigate,
    projectId,
    resetEditorState,
    updateProjectMutation,
  ]);

  const handleStatusChange = async (newStatus: string) => {
    if (!(project && projectId)) {
      return;
    }

    if (lifecycleStatus === "Draft" && newStatus === "Released") {
      return;
    }

    if (project.allergenReviewRequired) {
      scrollToAllergens();
      return;
    }

    if (newStatus === "Released" && hasRegulationBreaches) {
      const firstBreach = regulationBreaches[0];
      if (firstBreach) {
        scrollToItem(firstBreach.stepId);
      }
      window.alert(
        "Cannot release recipe: one or more ingredients exceed their regulation limit."
      );
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

    const nextReleaseNotes = newStatus === "Draft" ? "" : project.releaseNotes;

    // Pass releasedBy if transitioning to Released
    const releasedBy =
      newStatus === "Released"
        ? user?.name || user?.email || t("authorized_user")
        : undefined;

    try {
      await updateProjectMutation({
        id: projectId,
        status: newStatus as "Draft" | "Under Review" | "Released",
        releaseNotes: nextReleaseNotes,
        autosaveName: `Auto-Save: Changed status to ${newStatus}`,
        ...(releasedBy ? { releasedBy } : {}),
      });

      // Update local state to reflect UI immediately
      setProject({
        ...project,
        status: newStatus as "Draft" | "Under Review" | "Released",
        releaseNotes: nextReleaseNotes,
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

  const handleCreateNewVersion = async () => {
    if (!(project && projectId && isReleased) || isCreatingNewVersion) {
      return;
    }

    setIsCreatingNewVersion(true);
    try {
      const newProjectId = await createNewVersionMutation({ id: projectId });
      setProject(undefined);
      setPhases([]);
      setManualAllergenOverrides({});
      navigate(`/project/${newProjectId}?tab=formulation`);
      void logActivity({
        action: "Created New Draft Version",
        target: `${project.name} v${project.version}`,
        page: "Formulation",
      });
    } catch (err: unknown) {
      setIsCreatingNewVersion(false);
      window.alert((err as Error).message || "Failed to create new version");
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

  const scrollToAllergens = () => {
    document
      .getElementById("formulation-allergens")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const getIngredientName = (ingredientId?: string, fallback?: string) =>
    aggregatedIngredients.find((ingredient) => ingredient._id === ingredientId)
      ?.name ||
    fallback ||
    t("ingredient");

  const formatCriticalParameterValue = (
    parameter: NonNullable<RecipeStep["criticalParams"]>[number] | undefined
  ) => {
    const min =
      typeof parameter?.min === "number" && Number.isFinite(parameter.min)
        ? parameter.min
        : undefined;
    const max =
      typeof parameter?.max === "number" && Number.isFinite(parameter.max)
        ? parameter.max
        : undefined;
    if (min !== undefined && max !== undefined) {
      return min === max ? `${min}` : `${min}-${max}`;
    }
    if (max !== undefined) {
      return `${max}`;
    }
    if (min !== undefined) {
      return `${min}`;
    }
    return "blank";
  };

  const describeStepAutosave = (
    currentStep: RecipeStep | undefined,
    updates: Partial<RecipeStep>
  ) => {
    const nextStep = { ...currentStep, ...updates } as RecipeStep;
    if ("expectedWeight" in updates || "unit" in updates) {
      const ingredientName = getIngredientName(
        nextStep.ingredientId,
        nextStep.label
      );
      return `Auto-Save: Updated ${ingredientName} to ${formatAutosaveValue(nextStep.expectedWeight)}${nextStep.unit || "g"}`;
    }
    if ("ingredientId" in updates) {
      return `Auto-Save: Updated ingredient row to ${getIngredientName(updates.ingredientId, nextStep.label)}`;
    }
    if ("maxLimitPercent" in updates) {
      return `Auto-Save: Updated regulation limit for ${getIngredientName(nextStep.ingredientId, nextStep.label)} to ${formatAutosaveValue(updates.maxLimitPercent)}%`;
    }
    if ("criticalParams" in updates) {
      const parameter = updates.criticalParams?.[0];
      const parameterName = parameter?.name || currentStep?.label || "Critical";
      return `Auto-Save: Updated ${parameterName} parameter to ${formatCriticalParameterValue(parameter)}`;
    }
    if ("processTemp" in updates) {
      return `Auto-Save: Updated process temperature to ${formatAutosaveValue(updates.processTemp)}`;
    }
    if ("processSpeed" in updates) {
      return `Auto-Save: Updated process speed to ${formatAutosaveValue(updates.processSpeed)}`;
    }
    if ("durationSeconds" in updates) {
      return `Auto-Save: Updated timer to ${formatAutosaveValue(updates.durationSeconds)} seconds`;
    }
    if ("label" in updates) {
      return `Auto-Save: Updated step label to ${formatAutosaveValue(updates.label)}`;
    }
    if ("notes" in updates) {
      return `Auto-Save: Updated step notes`;
    }
    return DEFAULT_AUTOSAVE_NAME;
  };

  const addPhase = () => {
    if (!canEdit) {
      return;
    }
    const { phases: nextPhases, newPhase } = addPhaseToPhases(
      phases,
      t("new_phase")
    );
    queueAutosaveChange("phase.add", "Auto-Save: Added a new phase");
    setPhases(nextPhases);
    setTimeout(() => scrollToItem(newPhase.id), 100);
  };

  const updatePhase = (phaseId: string, updates: Partial<RecipePhase>) => {
    if (!canEdit) {
      return;
    }
    if (updates.name !== undefined) {
      queueAutosaveChange(
        `phase.${phaseId}.name`,
        `Auto-Save: Updated phase name to ${formatAutosaveValue(updates.name)}`
      );
    }
    setPhases(updatePhaseInPhases(phases, phaseId, updates));
  };

  const deletePhase = (phaseId: string) => {
    if (!canEdit) {
      return;
    }
    queueAutosaveChange("phase.delete", "Auto-Save: Deleted a phase");
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
    queueAutosaveChange(
      `step.${type}.add`,
      `Auto-Save: Added a ${type.replace(/_/g, " ")} step`
    );
    if (type === "weighing") {
      markAllergenReviewRequired();
    }
    setTimeout(() => scrollToItem(newStep.id), 100);
  };

  const addStepAfter = (
    phaseId: string,
    afterStepId: string,
    type: StepType
  ) => {
    if (!canEdit) {
      return;
    }
    const { phases: nextPhases, newStep } = addStepAfterStepInPhase(
      phases,
      phaseId,
      afterStepId,
      type,
      t("ph_level"),
      t("mini_spreadsheet")
    );
    setPhases(nextPhases);
    queueAutosaveChange(
      `step.${type}.addAfter`,
      `Auto-Save: Added a ${type.replace(/_/g, " ")} step`
    );
    if (type === "weighing") {
      markAllergenReviewRequired();
    }
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
    const changedStep = phases
      .find((phase) => phase.id === phaseId)
      ?.steps.find((step) => step.id === stepId);
    const nextPhases = updateStepInPhase(phases, phaseId, stepId, updates);
    queueAutosaveChange(
      `step.${stepId}`,
      describeStepAutosave(changedStep, updates)
    );
    setPhases(nextPhases);
    if (
      changedStep?.type === "weighing" &&
      ("ingredientId" in updates ||
        "expectedWeight" in updates ||
        "unit" in updates)
    ) {
      markAllergenReviewRequired();
    }
  };

  const deleteStep = (phaseId: string, stepId: string) => {
    if (!canEdit) {
      return;
    }
    const deletedStep = phases
      .find((phase) => phase.id === phaseId)
      ?.steps.find((step) => step.id === stepId);
    const nextPhases = deleteStepFromPhase(phases, phaseId, stepId);
    queueAutosaveChange(
      `step.${stepId}.delete`,
      `Auto-Save: Deleted ${deletedStep?.label || "a formulation step"}`
    );
    setPhases(nextPhases);
    if (deletedStep?.type === "weighing") {
      markAllergenReviewRequired();
    }
  };

  const reorderStep = (
    phaseId: string,
    startIndex: number,
    endIndex: number
  ) => {
    if (!canEdit || startIndex === endIndex) {
      return;
    }
    queueAutosaveChange(
      `phase.${phaseId}.reorderSteps`,
      "Auto-Save: Reordered formulation steps"
    );
    setPhases((currentPhases) =>
      reorderStepInPhase(currentPhases, phaseId, startIndex, endIndex)
    );
  };

  const reorderPhase = (startIndex: number, endIndex: number) => {
    if (!canEdit || startIndex === endIndex) {
      return;
    }
    queueAutosaveChange("phase.reorder", "Auto-Save: Reordered phases");
    setPhases((currentPhases) =>
      reorderPhases(currentPhases, startIndex, endIndex)
    );
  };

  if (!project) {
    return (
      <div className="-m-4 flex min-h-dvh items-center justify-center bg-white p-6 sm:-m-6 lg:-m-8 dark:bg-[#0f172a]">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="font-bold text-slate-700 dark:text-slate-200">
            {convexProject === undefined ? t("loading") : t("project_not_found")}
          </p>
          <button
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 font-bold text-sm text-white transition-colors hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"
            onClick={handleExitEditor}
            type="button"
          >
            <ChevronLeft size={16} />
            {t("exit_editor")}
          </button>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) =>
    `$${value.toLocaleString(undefined, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    })}`;

  return (
    <div className="-m-4 flex min-h-dvh flex-col bg-white sm:-m-6 lg:-m-8 dark:bg-[#0f172a]">
      {/* Header - Sticky */}
      <div className="relative z-10 flex shrink-0 flex-col justify-between gap-4 border-gray-100 border-b bg-white px-8 py-4 shadow-sm md:flex-row md:items-center dark:border-slate-800 dark:bg-[#0f172a]">
        <div className="flex items-center space-x-4">
          <button
            aria-label={t("exit_editor")}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-3 font-bold text-gray-600 text-sm transition-colors hover:bg-gray-100 hover:text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
            data-testid="exit-editor-button"
            onClick={handleExitEditor}
            title={t("exit_editor")}
            type="button"
          >
            <ChevronLeft size={20} />
            <span>{t("exit_editor")}</span>
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
                          )[lifecycleStatus] ||
                          "border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                        data-testid="formulation-status-select"
                        disabled={isReleased}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        value={lifecycleStatus}
                      >
                        <option value="Draft">{t("draft")}</option>
                        <option value="Under Review">
                          {t("under_review")}
                        </option>
                        <option
                          disabled={
                            lifecycleStatus === "Draft" || hasRegulationBreaches
                          }
                          value="Released"
                        >
                          {t("released")}
                        </option>
                      </select>
                      {isReleased && (
                        <>
                          <span
                            className="rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1.5 font-black text-[11px] text-emerald-900 uppercase tracking-wide dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                            data-testid="latest-read-only-badge"
                          >
                            {t("latest_read_only")}
                          </span>
                          <button
                            className="rounded-full border border-indigo-200 bg-white px-3 py-1.5 font-bold text-indigo-700 text-xs transition-colors hover:bg-indigo-50 disabled:cursor-wait disabled:opacity-70 dark:border-indigo-800/50 dark:bg-slate-900 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
                            data-testid="create-new-version-button"
                            disabled={isCreatingNewVersion}
                            onClick={handleCreateNewVersion}
                            type="button"
                          >
                            {isCreatingNewVersion
                              ? t("creating")
                              : t("create_new_version")}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <p className="flex items-center gap-2 font-medium text-gray-500 text-sm dark:text-slate-400">
                  <Folder size={14} />

                  {t("sequence_editor")}
                </p>
                {hasRegulationBreaches && (
                  <div className="mt-3 flex max-w-3xl items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-800 shadow-sm dark:border-red-800/60 dark:bg-red-950/30 dark:text-red-200">
                    <ShieldAlert className="mt-0.5 shrink-0" size={18} />
                    <div>
                      <p className="font-black text-sm">
                        {t("regulation_limit_release_blocked")}
                      </p>
                      <p className="mt-1 text-xs">
                        {regulationBreaches
                          .slice(0, 2)
                          .map(
                            (breach) =>
                              `${breach.ingredientName}: ${breach.actualPercent.toFixed(3)}% / max ${(breach.maxLimitPercent ?? 0).toFixed(3)}%`
                          )
                          .join(" • ")}
                      </p>
                    </div>
                  </div>
                )}
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
            <div
              className={`rounded-3xl border px-4 py-3 font-bold text-xs uppercase tracking-wide ${
                autosaveStatus === "error"
                  ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300"
                  : autosaveStatus === "saving"
                    ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300"
              }`}
              data-testid="autosave-status"
            >
              {autosaveStatus === "error"
                ? t("autosave_error")
                : autosaveStatus === "saving"
                  ? t("autosave_saving")
                  : t("autosave_saved")}
            </div>
          )}
        </div>
      </div>

      {project.allergenReviewRequired && canEdit && (
        <div className="border-amber-200 border-b bg-amber-50 px-6 py-3 dark:border-amber-800/50 dark:bg-amber-950/40">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3 text-amber-900 dark:text-amber-200">
              <ShieldAlert className="shrink-0" size={20} />
              <p className="font-bold text-sm">
                {t("formulation_allergens_changed_prompt")}
              </p>
            </div>
            <button
              className="self-start rounded-xl border border-amber-300 bg-white px-4 py-2 font-bold text-amber-800 text-xs transition-colors hover:bg-amber-100 md:self-auto dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-100 dark:hover:bg-amber-900"
              onClick={scrollToAllergens}
              type="button"
            >
              {t("review_allergens")}
            </button>
          </div>
        </div>
      )}

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

            <section
              className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm dark:border-amber-800/50 dark:bg-amber-950/20"
              id="formulation-allergens"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 font-black text-amber-950 text-sm uppercase tracking-widest dark:text-amber-100">
                    <ShieldAlert size={16} />
                    {t("allergens")}
                  </h2>
                  <p className="mt-1 text-amber-800 text-xs dark:text-amber-200/80">
                    {t("formulation_allergens_review_help")}
                  </p>
                </div>
                {project.allergenReviewRequired && (
                  <span className="rounded-full bg-amber-200 px-2 py-1 font-bold text-[10px] text-amber-900 uppercase dark:bg-amber-900 dark:text-amber-100">
                    {t("review_required")}
                  </span>
                )}
              </div>

              <label
                className="mb-3 block font-bold text-[10px] text-amber-900 uppercase tracking-wider dark:text-amber-100"
                htmlFor="formulation-allergen-region"
              >
                {t("allergen_region")}
              </label>
              <select
                className="mb-4 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 font-bold text-amber-950 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-70 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-100"
                disabled={!canEdit}
                id="formulation-allergen-region"
                onChange={(event) =>
                  handleAllergenRegionChange(event.target.value)
                }
                value={allergenRegion}
              >
                <option value="FDA">{t("region_fda")}</option>
                <option value="EU">{t("region_eu")}</option>
                <option value="GSO">{t("region_gso")}</option>
              </select>

              <div className="grid grid-cols-1 gap-2">
                {ALLERGEN_LISTS[allergenRegion].map((allergenKey) => (
                  <div key={allergenKey}>
                    <label
                      className={`flex items-center gap-2 rounded-xl border border-amber-100 bg-white px-3 py-2 text-amber-950 text-xs shadow-sm dark:border-amber-900/50 dark:bg-slate-900 dark:text-amber-100 ${
                        canEdit
                          ? "cursor-pointer"
                          : "cursor-not-allowed opacity-75"
                      }`}
                    >
                      <input
                        checked={selectedFormulationAllergens.includes(
                          allergenKey
                        )}
                        className="h-4 w-4 accent-amber-600"
                        disabled={!canEdit}
                        onChange={() => toggleFormulationAllergen(allergenKey)}
                        type="checkbox"
                      />
                      <span className="font-bold">{t(allergenKey)}</span>
                    </label>
                    {allergenKey === "allergen_tree_nuts" &&
                      selectedFormulationAllergens.includes(allergenKey) && (
                        <div className="ms-6 mt-2 grid grid-cols-1 gap-1">
                          {TREE_NUT_OPTIONS.map((subKey) => (
                            <label
                              className={`flex items-center gap-2 text-amber-900 text-xs dark:text-amber-100/80 ${
                                canEdit
                                  ? "cursor-pointer"
                                  : "cursor-not-allowed opacity-75"
                              }`}
                              key={subKey}
                            >
                              <input
                                checked={selectedFormulationAllergens.includes(
                                  subKey
                                )}
                                className="h-3.5 w-3.5 accent-amber-600"
                                disabled={!canEdit}
                                onChange={() =>
                                  toggleFormulationAllergen(subKey)
                                }
                                type="checkbox"
                              />
                              <span>{t(subKey)}</span>
                            </label>
                          ))}
                        </div>
                      )}
                  </div>
                ))}
              </div>

              {extraFormulationAllergens.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {extraFormulationAllergens.map((allergen) => (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-amber-200 px-3 py-1 font-bold text-amber-950 text-xs dark:bg-amber-900 dark:text-amber-100"
                      key={allergen}
                    >
                      {allergen}
                      <button
                        aria-label={t("remove_extra_allergen")}
                        className="rounded-full p-0.5 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-amber-800"
                        disabled={!canEdit}
                        onClick={() => removeExtraAllergen(allergen)}
                        type="button"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <input
                  className="min-w-0 flex-1 rounded-xl border border-amber-200 bg-white px-3 py-2 text-amber-950 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-70 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-100"
                  disabled={!canEdit}
                  onChange={(event) =>
                    setExtraAllergenInput(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addExtraAllergen();
                    }
                  }}
                  placeholder={t("extra_allergen_placeholder")}
                  type="text"
                  value={extraAllergenInput}
                />
                <button
                  className="rounded-xl bg-amber-600 px-3 py-2 font-bold text-white text-xs transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canEdit}
                  onClick={addExtraAllergen}
                  type="button"
                >
                  {t("add_allergen")}
                </button>
              </div>

              <button
                className="mt-4 w-full rounded-xl bg-slate-950 px-4 py-2.5 font-bold text-sm text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
                disabled={!canEdit}
                onClick={verifyFormulationAllergens}
                type="button"
              >
                {t("verify_allergens")}
              </button>
            </section>

            <section
              className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
              data-testid="nutrition-label-section"
            >
              <div className="border-2 border-black bg-white p-3 font-sans text-black shadow-sm">
                <h2 className="border-black border-b-8 pb-1 font-black text-4xl leading-none tracking-tight">
                  {t("nutrition_facts")}
                </h2>
                <div className="border-black border-b py-1 font-bold text-sm">
                  {t("serving_size")}{" "}
                  <span className="float-right">
                    {calculatedMeasures.servingSizeWeight.toFixed(0)}g
                  </span>
                </div>
                <div className="border-black border-b-4 py-1">
                  <p className="font-bold text-xs">{t("amount_per_serving")}</p>
                  <div className="flex items-end justify-between">
                    <span className="font-black text-2xl">{t("calories")}</span>
                    <span
                      className="font-black text-3xl"
                      data-testid="nutrition-calories"
                    >
                      {nutritionFacts.calories}
                    </span>
                  </div>
                </div>
                <div className="border-black border-b py-1 text-right font-black text-xs">
                  {t("daily_value_percent")}
                </div>
                <div className="border-black border-b py-1 font-bold text-sm">
                  {t("total_fat")}{" "}
                  <span data-testid="nutrition-fat">{nutritionFacts.fat}g</span>
                </div>
                <div className="border-black border-b py-1 font-bold text-sm">
                  {t("total_carbohydrate")}{" "}
                  <span data-testid="nutrition-carbohydrates">
                    {nutritionFacts.carbohydrates}g
                  </span>
                </div>
                <div className="border-black border-b py-1 font-bold text-sm">
                  {t("protein")}{" "}
                  <span data-testid="nutrition-protein">
                    {nutritionFacts.protein}g
                  </span>
                </div>
                <div className="pt-2 text-[10px] leading-tight">
                  {t("daily_values_reference_note")}
                </div>
                <div className="mt-3 border-black border-t-4 pt-2">
                  <p className="font-black text-[11px] uppercase tracking-wide">
                    {t("ingredients")}
                  </p>
                  <p
                    className="mt-1 text-[11px] leading-snug"
                    data-testid="nutrition-ingredient-statement"
                  >
                    {ingredientStatement || t("no_ingredients_selected")}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Main Canvas - Continuous Scroll (75%) */}
        <div className="flex-1 overflow-y-auto scroll-smooth bg-gray-100/30 pb-32 dark:bg-[#0f172a]">
          <div className="fade-in zoom-in-95 mx-auto max-w-4xl animate-in space-y-16 p-6 duration-200 lg:p-12">
            {/* The Release Stamp */}
            {isReleased && (
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
            {project.status === "Under Review" && (
              <div className="space-y-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-[#1e293b]">
                <h3 className="flex items-center gap-2 font-bold text-gray-900 text-sm dark:text-white">
                  <FileSignature className="text-indigo-500" size={16} />

                  {t("release_notes")}
                </h3>
                <textarea
                  className="h-24 w-full resize-y rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-900 text-sm placeholder-gray-400 transition-all focus:border-transparent focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  onChange={(e) => {
                    queueAutosaveChange(
                      "metadata.releaseNotes",
                      "Auto-Save: Updated release notes"
                    );
                    setProject({ ...project, releaseNotes: e.target.value });
                  }}
                  placeholder={t("release_notes_placeholder")}
                  value={project.releaseNotes || ""}
                />
              </div>
            )}

            <section
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-[#1e293b]"
              data-testid="recipe-measures-section"
            >
              <div className="flex flex-col gap-5 border-slate-100 border-b p-5 md:flex-row md:items-start md:justify-between dark:border-slate-700">
                <div>
                  <p className="font-black text-slate-500 text-xs uppercase tracking-wide dark:text-slate-400">
                    {t("measures")}
                  </p>
                  <div className="mt-3 flex rounded-full border border-cyan-200 bg-cyan-50 p-1 dark:border-cyan-800/50 dark:bg-cyan-950/40">
                    {(["Liquid", "Solid"] as FormulationState[]).map(
                      (state) => (
                        <button
                          className={`rounded-full px-4 py-2 font-bold text-sm transition-colors ${
                            (project.formulationState || "Liquid") === state
                              ? "bg-cyan-600 text-white shadow-sm"
                              : "text-cyan-800 hover:bg-cyan-100 dark:text-cyan-300 dark:hover:bg-cyan-900/50"
                          }`}
                          data-testid={`formulation-state-${state.toLowerCase()}-button`}
                          disabled={!canEdit}
                          key={state}
                          onClick={() => handleFormulationStateChange(state)}
                          type="button"
                        >
                          {t(state === "Liquid" ? "liquid" : "solid")}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800/50 dark:bg-emerald-950/40">
                    <p className="font-bold text-emerald-700 text-xs dark:text-emerald-300">
                      {t("total_project_rd_cost")}
                    </p>
                    <p
                      className="mt-1 font-black text-2xl text-emerald-950 dark:text-emerald-100"
                      data-testid="total-project-rd-cost-display"
                    >
                      {formatCurrency(totalProjectRDCost)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                    <p className="font-bold text-slate-500 text-xs dark:text-slate-400">
                      {t("batch_yield")}
                    </p>
                    <p
                      className="mt-1 font-black text-2xl text-slate-900 dark:text-white"
                      data-testid="batch-yield-display"
                    >
                      {calculatedMeasures.batchYield}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                    <p className="font-bold text-slate-500 text-xs dark:text-slate-400">
                      {t("batch_weight")}
                    </p>
                    <p
                      className="mt-1 font-black text-2xl text-slate-900 dark:text-white"
                      data-testid="batch-weight-display"
                    >
                      {calculatedBatchWeight}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                    <p className="font-bold text-slate-500 text-xs dark:text-slate-400">
                      {t("batch_cost_usd")}
                    </p>
                    <p
                      className="mt-1 font-black text-2xl text-slate-900 dark:text-white"
                      data-testid="batch-cost-display"
                    >
                      {formatCurrency(calculatedCosts.batchCost)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                    <p className="font-bold text-slate-500 text-xs dark:text-slate-400">
                      {t("cost_per_serving_usd")}
                    </p>
                    <p
                      className="mt-1 font-black text-2xl text-slate-900 dark:text-white"
                      data-testid="cost-per-serving-display"
                    >
                      {formatCurrency(calculatedCosts.costPerServing)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_220px_220px] lg:items-center">
                <div className="flex flex-wrap rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
                  {(
                    [
                      ["recipeMakes", t("a_recipe_makes")],
                      ["servingIs", t("a_serving_is")],
                    ] as [ServingSizeMode, string][]
                  ).map(([mode, label]) => (
                    <button
                      className={`flex-1 rounded-xl px-4 py-2.5 font-bold text-sm transition-colors ${
                        servingSizeMode === mode
                          ? "bg-slate-950 text-white shadow-sm dark:bg-slate-100 dark:text-slate-950"
                          : "text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700"
                      }`}
                      data-testid={`serving-size-mode-${mode}-button`}
                      disabled={!canEdit}
                      key={mode}
                      onClick={() => handleServingSizeModeChange(mode)}
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <label className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                  <span className="block font-bold text-slate-500 text-xs dark:text-slate-400">
                    {t("amount")}
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      className="min-w-0 flex-1 bg-transparent font-black text-slate-900 text-xl outline-none dark:text-white"
                      data-testid="serving-size-amount-input"
                      disabled={!canEdit}
                      min="0"
                      onChange={(e) =>
                        handleServingAmountChange(e.target.value)
                      }
                      placeholder="0"
                      step="any"
                      type="number"
                      value={servingSizeAmount ?? ""}
                    />
                    {servingSizeMode === "servingIs" ? (
                      <select
                        aria-label={t("serving_size_unit")}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-black text-slate-700 text-xs uppercase outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-indigo-900/40"
                        data-testid="serving-size-unit-select"
                        disabled={!canEdit}
                        onChange={(e) =>
                          handleServingSizeUnitChange(
                            e.target.value as ServingSizeUnit
                          )
                        }
                        value={servingSizeUnit}
                      >
                        {SERVING_SIZE_UNITS.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="rounded-lg bg-slate-100 px-2 py-1 font-black text-slate-500 text-xs uppercase dark:bg-slate-800 dark:text-slate-300">
                        {t("servings")}
                      </span>
                    )}
                  </div>
                </label>

                <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 dark:border-indigo-800/50 dark:bg-indigo-950/40">
                  <p className="font-bold text-indigo-700 text-xs dark:text-indigo-300">
                    {t("serving_size_weight")}
                  </p>
                  <p
                    className="mt-1 font-black text-2xl text-indigo-950 dark:text-indigo-100"
                    data-testid="serving-size-weight-display"
                  >
                    {calculatedMeasures.servingSizeWeight} g
                  </p>
                </div>

                <input
                  aria-readonly="true"
                  className="sr-only"
                  data-testid="formulation-batch-weight-input"
                  readOnly
                  type="number"
                  value={calculatedBatchWeight}
                />
              </div>
            </section>

            <section
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-[#1e293b]"
              data-testid="recipe-packaging-section"
            >
              <div className="border-slate-100 border-b p-5 dark:border-slate-700">
                <p className="font-black text-slate-500 text-xs uppercase tracking-wide dark:text-slate-400">
                  {t("packaging")}
                </p>
                <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_180px_180px]">
                  <label className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                    <span className="block font-bold text-slate-500 text-xs dark:text-slate-400">
                      {t("packaging_item")}
                    </span>
                    <select
                      className="mt-1 w-full bg-transparent font-black text-lg text-slate-900 outline-none dark:text-white"
                      data-testid="packaging-item-select"
                      disabled={!canEdit}
                      onChange={(event) =>
                        handlePackagingSelectionChange(event.target.value)
                      }
                      value={project.packagingItemName ?? ""}
                    >
                      <option value="">{t("select_packaging")}</option>
                      {PACKAGING_OPTIONS.filter((option) => option.name).map(
                        (option) => (
                          <option key={option.name} value={option.name}>
                            {option.name}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                    <span className="block font-bold text-slate-500 text-xs dark:text-slate-400">
                      {t("unit_price_usd")}
                    </span>
                    <input
                      className="mt-1 w-full bg-transparent font-black text-slate-900 text-xl outline-none dark:text-white"
                      data-testid="packaging-unit-price-input"
                      disabled={!canEdit}
                      min="0"
                      onChange={(event) =>
                        handlePackagingNumberChange(
                          "packagingUnitPrice",
                          event.target.value
                        )
                      }
                      placeholder="0.00"
                      step="any"
                      type="number"
                      value={project.packagingUnitPrice ?? ""}
                    />
                  </label>

                  <label className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                    <span className="block font-bold text-slate-500 text-xs dark:text-slate-400">
                      {t("target_capacity_g")}
                    </span>
                    <input
                      className="mt-1 w-full bg-transparent font-black text-slate-900 text-xl outline-none dark:text-white"
                      data-testid="packaging-capacity-input"
                      disabled={!canEdit}
                      min="0"
                      onChange={(event) =>
                        handlePackagingNumberChange(
                          "packagingCapacity",
                          event.target.value
                        )
                      }
                      placeholder="0"
                      step="any"
                      type="number"
                      value={project.packagingCapacity ?? ""}
                    />
                  </label>
                </div>
              </div>

              <div className="grid gap-4 p-5 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                  <p className="font-bold text-slate-500 text-xs dark:text-slate-400">
                    {t("ingredient_cost_per_serving_usd")}
                  </p>
                  <p className="mt-1 font-black text-2xl text-slate-900 dark:text-white">
                    {formatCurrency(calculatedCosts.costPerServing)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                  <p className="font-bold text-slate-500 text-xs dark:text-slate-400">
                    {t("packaging_cost_per_unit_usd")}
                  </p>
                  <p
                    className="mt-1 font-black text-2xl text-slate-900 dark:text-white"
                    data-testid="packaging-cost-per-unit-display"
                  >
                    {formatCurrency(
                      calculatedPackagingCosts.packagingCostPerUnit
                    )}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800/50 dark:bg-emerald-950/40">
                  <p className="font-bold text-emerald-700 text-xs dark:text-emerald-300">
                    {t("total_finished_good_cost_per_unit_usd")}
                  </p>
                  <p
                    className="mt-1 font-black text-2xl text-emerald-950 dark:text-emerald-100"
                    data-testid="finished-good-cost-per-unit-display"
                  >
                    {formatCurrency(
                      calculatedPackagingCosts.finishedGoodCostPerUnit
                    )}
                  </p>
                </div>
              </div>

              {servingExceedsPackagingCapacity && (
                <div
                  className="mx-5 mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 font-bold text-amber-800 text-sm dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200"
                  data-testid="packaging-capacity-warning"
                >
                  {t("serving_size_exceeds_packaging_capacity")}
                </div>
              )}
            </section>

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
                        addStepAfter={addStepAfter}
                        aggregatedIngredients={aggregatedIngredients}
                        batchWeight={calculatedBatchWeight}
                        canEdit={canEdit}
                        deletePhase={deletePhase}
                        deleteStep={deleteStep}
                        flatSteps={flatSteps}
                        formulationContext={{
                          ingredients: derivedIngredients,
                          phases,
                        }}
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
