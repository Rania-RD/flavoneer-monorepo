import type { EnrichedProject, RunRecipePhase, RunRecipeStep } from "../types";

// Mock Ingredients for Empty State
export const MOCK_INGREDIENTS: RunRecipeStep[] = [
  {
    id: "mock-1",
    type: "weighing",
    label: "Whey Protein Isolate",
    isCompleted: false,
    expectedWeight: 50,
    actualWeight: 0,
    unit: "kg",
    tolerance: 0.02,
  },
  {
    id: "mock-2",
    type: "weighing",
    label: "Maltodextrin",
    isCompleted: false,
    expectedWeight: 25,
    actualWeight: 0,
    unit: "kg",
    tolerance: 0.02,
  },
  {
    id: "mock-3",
    type: "weighing",
    label: "Mineral Premix",
    isCompleted: false,
    expectedWeight: 2.5,
    actualWeight: 0,
    unit: "kg",
    tolerance: 0.01,
  },
];

// Helper to ensure all projects follow the 5-Step Workflow
export const normalizeProjectPhases = (
  project: EnrichedProject
): RunRecipePhase[] => {
  // Step 1: Raw Material Preparation (Weighing)
  const weighingSteps: RunRecipeStep[] = project.ingredients.map((ing) => ({
    id: `weigh-${ing.id}`,
    type: "weighing",
    label: ing.name,
    isCompleted: false,
    ingredientId: ing.id,
    expectedWeight: ing.weight,
    unit: ing.unit || "g",
    actualWeight: 0,
    inputRequest: {
      label: "Lot Number",
      required: true,
    },
    notes: "Scan lot barcode if available",
  }));

  // Step 2: Processing & SOP Execution
  let processingSteps: RunRecipeStep[] = [];
  if (project.phases && project.phases.length > 0) {
    project.phases.forEach((p) => {
      p.steps.forEach((s) => {
        if (s.type === "timer" || s.type === "process") {
          processingSteps.push({ ...s, isCompleted: false });
        }
      });
    });
  }

  if (processingSteps.length === 0) {
    if (project.productType === "Liquid Supplement") {
      processingSteps = [
        {
          id: "proc-1",
          type: "process",
          label: "High Shear Mixing",
          isCompleted: false,
          notes: "Mix ingredients at high speed.",
          processSpeed: "2000 RPM",
        },
        {
          id: "proc-2",
          type: "process",
          label: "Homogenization",
          isCompleted: false,
          notes: "Pass through homogenizer at 500 bar.",
        },
        {
          id: "timer-1",
          type: "timer",
          label: "De-aeration Rest",
          isCompleted: false,
          durationSeconds: 600,
          notes: "Allow air bubbles to escape.",
        },
      ];
    } else if (project.productType === "Powdered Formula") {
      processingSteps = [
        {
          id: "proc-1",
          type: "process",
          label: "Sifting",
          isCompleted: false,
          notes: "Sift all ingredients through 40 mesh screen.",
        },
        {
          id: "proc-2",
          type: "process",
          label: "Dry Blending",
          isCompleted: false,
          notes: "Blend in V-blender for 15 minutes.",
        },
        {
          id: "timer-1",
          type: "timer",
          label: "Settling Time",
          isCompleted: false,
          durationSeconds: 120,
          notes: "Allow dust to settle before opening.",
        },
      ];
    } else {
      // Default / Probiotic Paste
      processingSteps = [
        {
          id: "proc-1",
          type: "process",
          label: "Mixing Stage",
          isCompleted: false,
          notes: "Mix at high shear for 5 minutes.",
          processSpeed: "1500 RPM",
        },
        {
          id: "timer-1",
          type: "timer",
          label: "Hydration Rest",
          isCompleted: false,
          durationSeconds: 300,
          notes: "Allow mixture to hydrate.",
        },
        {
          id: "proc-2",
          type: "process",
          label: "Heating",
          isCompleted: false,
          notes: "Heat to 85°C.",
          processTemp: 85,
        },
      ];
    }
  }

  // Step 3: In-Process Quality Control (IPQC)
  const qcStep: RunRecipeStep = {
    id: "qc-final",
    type: "process",
    label: "Final Quality Check",
    isCompleted: false,
    qcParams: [
      { id: "ph", label: "pH Level", min: 3.0, max: 4.5, unit: "pH" },
      { id: "brix", label: "Brix", min: 10, max: 12, unit: "°Bx" },
      { id: "temp", label: "Temperature", min: 20, max: 90, unit: "°C" },
    ],
  };

  return [
    {
      id: "phase-1-weighing",
      name: "Step 1: Raw Material Preparation",
      color: "blue",
      steps: weighingSteps,
    },
    {
      id: "phase-2-processing",
      name: "Step 2: Processing & SOP",
      color: "purple",
      steps: processingSteps,
    },
    {
      id: "phase-3-qc",
      name: "Step 3: In-Process Quality Control",
      color: "orange",
      steps: [qcStep],
    },
    {
      id: "phase-4-sensory",
      name: "Step 4: Sensory Evaluation",
      color: "rose",
      steps: [],
    },
    {
      id: "phase-5-final",
      name: "Step 5: Finalization",
      color: "green",
      steps: [],
    },
  ];
};

// Helper: Generate Unique Batch Code based on project config
export const generateBatchCode = (
  project: EnrichedProject,
  existingRunCount: number
) => {
  const prefix =
    project.batchCodePrefix ||
    project.name.split(" ")[0].toUpperCase().slice(0, 4);
  const format = project.batchCodeFormat || "prefix-seq";
  const seq = existingRunCount + 1;

  switch (format) {
    case "prefix-date-seq": {
      const now = new Date();
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      return `${prefix}-${yy}${mm}${dd}-${String(seq).padStart(3, "0")}`;
    }
    case "prefix-random": {
      const digits = Math.floor(Math.random() * 900 + 100);
      const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
      return `${prefix}-${digits}${letter}`;
    }
    case "prefix-seq":
    default:
      return `${prefix}-${String(seq).padStart(3, "0")}`;
  }
};
