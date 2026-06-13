import type {
  RunListItem,
  RunRecipePhase,
  RunRecipeStep,
  RunRecord,
} from "../../types";

const toRunStatus = (status: RunListItem["status"]) => {
  if (
    status === "completed" ||
    status === "failed" ||
    status === "In Progress"
  ) {
    return status;
  }

  return undefined;
};

export const buildRunsHistory = (
  runsRaw: RunListItem[] | undefined
): RunRecord[] => {
  if (!runsRaw) {
    return [];
  }

  return runsRaw
    .filter((run) => run.endTime !== undefined && run.endTime !== null)
    .map((run) => {
      const start = new Date(run.startTime);
      const end = new Date(run.endTime ?? run.startTime);
      const diff = end.getTime() - start.getTime();
      const minutes = Math.floor(diff / 60_000);
      const seconds = Math.floor((diff % 60_000) / 1000);

      return {
        ...run,
        id: run._id,
        startTime: start,
        endTime: end,
        status: toRunStatus(run.status),
        durationString: `${minutes}m ${seconds}s`,
        phases: run.phases?.map(
          (phase): RunRecipePhase => ({
            ...phase,
            color: phase.color as RunRecipePhase["color"],
            steps:
              phase.steps?.map(
                (step): RunRecipeStep => ({
                  ...step,
                  type: step.type as RunRecipeStep["type"],
                  isCompleted: step.isCompleted ?? false,
                })
              ) || [],
          })
        ),
      };
    })
    .reverse();
};
