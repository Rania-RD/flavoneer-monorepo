import {
  closestCenter,
  DndContext,
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
import { GripHorizontal, Trash2 } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { StepType } from "../../types";
import { AddStepMenu } from "./add-step-menu";
import { SortableStepWrapper } from "./sortable-step-wrapper";
import { StepCard } from "./step-card";
import type { PhaseProps } from "./types";

export const Phase: React.FC<PhaseProps> = ({
  phase,
  colorStyle,
  letter,
  onDelete,
  onUpdateName,
  onAddStep,
  onAddStepAfter,
  onUpdateStep,
  onDeleteStep,
  onReorderSteps,
  availableStepsToDependOn,
  getDependency,
  onSaveDependency,
  isStepLocked,
  readOnly = false,
  aggregatedIngredients = [],
  batchWeight,
  additiveLimits,
  isDraggingPhase = false,
  dragHandleProps,
  projectId,
  formulationContext,
}) => {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeDependencyMenu, setActiveDependencyMenu] = useState<
    string | null
  >(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: {
    active: { id: string | number };
    over: { id: string | number } | null;
  }) => {
    const { active, over } = event;
    if (over && active.id !== over.id && onReorderSteps) {
      const oldIndex = phase.steps.findIndex((step) => step.id === active.id);
      const newIndex = phase.steps.findIndex((step) => step.id === over.id);
      onReorderSteps(oldIndex, newIndex);
    }
  };

  const handleAddStep = (type: StepType) => {
    onAddStep(type);
    setIsMenuOpen(false);
  };

  const handleToggleDependencyMenu = (stepId: string) => {
    setActiveDependencyMenu((currentStepId) =>
      currentStepId === stepId ? null : stepId
    );
  };

  const isAnyMenuOpen = isMenuOpen || activeDependencyMenu !== null;

  return (
    <div
      className={`relative space-y-4 border bg-white p-4 transition-colors lg:p-5 ${colorStyle.border} ${colorStyle.darkBorder || ""} ${isAnyMenuOpen ? "z-[100] ring-1 ring-sky-600/30" : "z-10 hover:z-20"} dark:bg-slate-950`}
    >
      <div className="relative z-10 flex flex-col items-start gap-3 border-slate-200 border-b pb-4 md:flex-row md:items-center dark:border-slate-800">
        {!readOnly && (
          <div
            className="cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing dark:text-slate-500 dark:hover:text-slate-300"
            {...dragHandleProps}
          >
            <GripHorizontal size={24} />
          </div>
        )}
        <div
          className={`flex h-11 w-11 flex-shrink-0 items-center justify-center border font-semibold text-lg dark:border-transparent ${colorStyle.bg} ${colorStyle.text} ${colorStyle.darkBg || ""} ${colorStyle.darkText || ""} ${colorStyle.border}`}
        >
          {letter}
        </div>
        <div className="w-full flex-1">
          <label
            className="mb-1 block cursor-pointer font-bold text-[10px] text-gray-500 uppercase tracking-widest dark:text-slate-400"
            htmlFor={`phase-name-${phase.id}`}
          >
            {t("phase_module")}
          </label>
          <input
            className="w-full border-0 bg-transparent p-0 font-semibold text-2xl text-slate-950 placeholder-slate-400 focus:ring-0 dark:text-white dark:placeholder-slate-500"
            disabled={readOnly}
            id={`phase-name-${phase.id}`}
            name="phaseName"
            onChange={(event) => onUpdateName(event.target.value)}
            placeholder={t("phase_name_placeholder")}
            value={phase.name}
          />
        </div>
        {!readOnly && onDelete && (
          <button
            aria-label={t("delete_phase")}
            className="enterprise-button self-start p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 md:self-center dark:hover:bg-red-950/30"
            onClick={onDelete}
            title={t("delete_phase")}
            type="button"
          >
            <Trash2 size={20} />
          </button>
        )}
      </div>

      {!isDraggingPhase && phase.steps.length > 0 && (
        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          sensors={sensors}
        >
          <SortableContext
            items={phase.steps.map((step) => step.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {phase.steps.map((step, stepIndex) => {
                const dependency = getDependency(step.id);
                const isLocked = isStepLocked(step.id);
                const stepIndexInAvailable = availableStepsToDependOn.findIndex(
                  (availableStep) => availableStep.key === step.id
                );
                const previousSteps =
                  stepIndexInAvailable > -1
                    ? availableStepsToDependOn.slice(0, stepIndexInAvailable)
                    : [];

                return (
                  <SortableStepWrapper
                    disabled={readOnly || isLocked}
                    id={step.id}
                    key={step.id}
                  >
                    {(attributes, listeners) => (
                      <StepCard
                        activeDependencyMenu={activeDependencyMenu}
                        additiveLimits={additiveLimits}
                        aggregatedIngredients={aggregatedIngredients}
                        attributes={attributes}
                        batchWeight={batchWeight}
                        colorStyle={colorStyle}
                        dependency={dependency}
                        isLocked={isLocked}
                        letter={letter}
                        listeners={listeners}
                        onDeleteStep={onDeleteStep}
                        onAddStepAfter={onAddStepAfter}
                        onSaveDependency={onSaveDependency}
                        onToggleDependencyMenu={handleToggleDependencyMenu}
                        onUpdateStep={onUpdateStep}
                        previousSteps={previousSteps}
                        projectId={projectId}
                        readOnly={readOnly}
                        step={step}
                        stepIndex={stepIndex}
                        formulationContext={formulationContext}
                      />
                    )}
                  </SortableStepWrapper>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {!readOnly && (
        <AddStepMenu
          isOpen={isMenuOpen}
          onAddStep={handleAddStep}
          onToggle={() => setIsMenuOpen((isOpen) => !isOpen)}
        />
      )}
    </div>
  );
};

export default Phase;
