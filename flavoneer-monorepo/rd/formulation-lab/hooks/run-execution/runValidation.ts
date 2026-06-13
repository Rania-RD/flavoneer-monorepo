import type { RecipePhase } from "../../types";

export interface RunValidationState {
  activePhase?: RecipePhase;
  conditionalAnswers: Record<string, "pass" | "fail" | null>;
  currentStepIndex: number;
  qcValues: Record<string, number>;
  runValues: Record<string, number>;
  stepLogs: Record<string, { startTime?: number; completed?: boolean }>;
}

export interface RunValidationResult {
  bgColor: string;
  color: string;
  isValid: boolean;
  message: string;
}

export function getRunValidation({
  activePhase,
  conditionalAnswers,
  currentStepIndex,
  qcValues,
  runValues,
  stepLogs,
}: RunValidationState): RunValidationResult {
  if (!activePhase) {
    return {
      isValid: false,
      message: "",
      color: "text-gray-400",
      bgColor: "bg-gray-100",
    };
  }

  const currentStep = activePhase.steps[currentStepIndex];

  if (!currentStep) {
    return {
      isValid: true,
      message: "Phase Complete",
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
    };
  }

  if (currentStep.type === "weighing") {
    const target = currentStep.expectedWeight || 0;
    const actual = runValues[currentStep.id];
    const tolerance = currentStep.tolerance || target * 0.05;

    if (actual && Math.abs(actual - target) <= tolerance) {
      return {
        isValid: true,
        message: "Weight within tolerance",
        color: "text-emerald-600",
        bgColor: "bg-emerald-100",
      };
    }
    return {
      isValid: false,
      message: "Weigh ingredient to specification",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    };
  }

  if (currentStep.type === "timer") {
    const log = stepLogs[currentStep.id];
    if (log?.completed) {
      return {
        isValid: true,
        message: "Timer Completed",
        color: "text-emerald-600",
        bgColor: "bg-emerald-100",
      };
    }
    if (log?.startTime) {
      return {
        isValid: false,
        message: "Timer Running...",
        color: "text-orange-600",
        bgColor: "bg-orange-100",
      };
    }
    return {
      isValid: false,
      message: "Start the timer",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    };
  }

  if (currentStep.type === "conditional") {
    const answer = conditionalAnswers[currentStep.id];
    if (answer === "pass") {
      return {
        isValid: true,
        message: "Condition Passed",
        color: "text-emerald-600",
        bgColor: "bg-emerald-100",
      };
    }
    if (answer === "fail") {
      return {
        isValid: true,
        message: "Condition Failed - Requires Disposal",
        color: "text-rose-600",
        bgColor: "bg-rose-100",
      };
    }
    return {
      isValid: false,
      message: "Select Pass or Fail",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    };
  }

  if (currentStep.type === "process") {
    const log = stepLogs[currentStep.id];
    if (log?.startTime) {
      return {
        isValid: true,
        message: "Step In Progress",
        color: "text-emerald-600",
        bgColor: "bg-emerald-100",
      };
    }
    return {
      isValid: false,
      message: "Log start time to proceed",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    };
  }

  if (currentStep.type === "critical_check") {
    if (!currentStep.criticalParams || currentStep.criticalParams.length === 0) {
      return {
        isValid: true,
        message: "No QC Params",
        color: "text-gray-600",
        bgColor: "bg-gray-100",
      };
    }

    const allValid = currentStep.criticalParams.every((param) => {
      const value = qcValues[`${currentStep.id}-${param.name}`];
      const min = param.min ?? Number.NEGATIVE_INFINITY;
      const max = param.max ?? Number.POSITIVE_INFINITY;
      return value !== undefined && value >= min && value <= max;
    });

    if (allValid) {
      return {
        isValid: true,
        message: "QC Validated",
        color: "text-emerald-600",
        bgColor: "bg-emerald-100",
      };
    }
    return {
      isValid: false,
      message: "QC Parameters Out of Range",
      color: "text-rose-600",
      bgColor: "bg-rose-100",
    };
  }

  return {
    isValid: true,
    message: "Ready to Proceed",
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
  };
}
