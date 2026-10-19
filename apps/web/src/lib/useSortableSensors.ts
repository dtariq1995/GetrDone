import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

// Input methods for reordering lists (task rows, Kanban cards).
export function useSortableSensors() {
  return useSensors(
    // Start dragging only after 5px of movement, so clicks still work.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    // Arrow keys move the item to the next/previous slot in the list.
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
}
