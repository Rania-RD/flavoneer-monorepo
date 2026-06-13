import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type React from "react";

interface SortableStepWrapperProps {
  children: (
    attributes: DraggableAttributes,
    listeners: DraggableSyntheticListeners | undefined
  ) => React.ReactNode;
  disabled: boolean;
  id: string;
}

export const SortableStepWrapper = ({
  id,
  disabled,
  children,
}: SortableStepWrapperProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: "relative" as const,
  };

  return (
    <div
      className={isDragging ? "z-50 scale-[1.02] opacity-50 shadow-2xl" : ""}
      ref={setNodeRef}
      style={style}
    >
      {children(attributes, listeners)}
    </div>
  );
};
