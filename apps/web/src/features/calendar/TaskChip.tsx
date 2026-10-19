import { useDraggable } from '@dnd-kit/core';
import { format } from 'date-fns';
import type { Task } from '../../api/tasks';
import { priorityStyle } from '../../lib/priority';

type TaskChipProps = {
  task: Task;
  selected?: boolean;
  // The original chip, faded while its copy is being dragged.
  dimmed?: boolean;
  // The copy shown under the pointer while dragging (not draggable itself).
  overlay?: boolean;
  onOpen?: () => void;
};

// A task in a calendar cell. Click (or Enter) opens it; drag it (or press
// Space, then the arrow keys) to move it to another day.
export function TaskChip({
  task,
  selected = false,
  dimmed = false,
  overlay = false,
  onOpen,
}: TaskChipProps) {
  const { setNodeRef, attributes, listeners } = useDraggable({
    id: task.id,
    data: { task },
    disabled: overlay,
  });
  const done = task.completedAt !== null;
  const time =
    task.dueAt && !task.isAllDay ? format(new Date(task.dueAt), 'h:mma') : null;
  const colors = selected
    ? 'bg-accent-muted text-ink'
    : done
      ? 'bg-surface-muted text-ink-faint line-through'
      : 'bg-surface-sunken text-ink-soft hover:bg-surface-strong';

  return (
    <button
      ref={overlay ? undefined : setNodeRef}
      type="button"
      onClick={onOpen}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
      aria-label={`${task.title}${time ? `, ${time}` : ''}${done ? ', done' : ''}`}
      className={`flex w-full min-w-0 items-center gap-1 truncate rounded border-l-[3px] px-1.5 py-0.5 text-left text-xs transition ${
        priorityStyle(task.priority).border
      } ${colors} ${dimmed ? 'opacity-40' : ''} ${
        overlay ? 'cursor-grabbing shadow-lg' : 'cursor-grab'
      }`}
    >
      {time && (
        <span className="shrink-0 text-ink-muted lowercase">{time}</span>
      )}
      <span className="truncate">{task.title}</span>
    </button>
  );
}
