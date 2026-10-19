import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';

type DragHandleProps = {
  label: string;
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
  setRef: (element: HTMLElement | null) => void;
};

// The grip used to drag a task row or card. Dragging starts only from here,
// so the rest of the row keeps working normally (Space on the checkbox
// ticks it instead of picking the row up). Keyboard: focus the grip, press
// Space, use the arrow keys, Space again to drop.
export function DragHandle({
  label,
  attributes,
  listeners,
  setRef,
}: DragHandleProps) {
  return (
    <button
      ref={setRef}
      type="button"
      aria-label={label}
      {...attributes}
      {...listeners}
      className="cursor-grab touch-none rounded p-0.5 text-ink-faint opacity-0 group-hover:opacity-100 hover:text-ink-muted focus:opacity-100 active:cursor-grabbing"
    >
      <GripVertical className="size-4" aria-hidden />
    </button>
  );
}
