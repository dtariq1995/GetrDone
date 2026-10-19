import { useDroppable } from '@dnd-kit/core';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import type { Task } from '../../api/tasks';
import { TaskChip } from './TaskChip';
import { dayKey } from './calendar';

type DayCellProps = {
  day: Date;
  tasks: Task[];
  maxVisible: number;
  // Days from the previous/next month that pad out the month grid.
  faded: boolean;
  today: boolean;
  selectedId: string | null;
  draggingId?: string;
  onOpenTask: (id: string) => void;
  onAdd: () => void;
  onShowMore: () => void;
};

// One day in the grid. It's a drop target: dropping a task here moves the
// task's due date to this day.
export function DayCell({
  day,
  tasks,
  maxVisible,
  faded,
  today,
  selectedId,
  draggingId,
  onOpenTask,
  onAdd,
  onShowMore,
}: DayCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id: dayKey(day) });
  const shown = tasks.slice(0, maxVisible);
  const hidden = tasks.length - shown.length;

  return (
    <div
      ref={setNodeRef}
      className={`group flex min-h-28 min-w-0 flex-col gap-1 border-r border-b border-line-subtle p-1.5 transition ${
        isOver
          ? 'bg-accent-subtle'
          : faded
            ? 'bg-surface-muted/70'
            : 'bg-surface'
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`flex size-6 items-center justify-center rounded-full text-xs font-medium ${
            today
              ? 'bg-accent text-white'
              : faded
                ? 'text-ink-faint'
                : 'text-ink-soft'
          }`}
        >
          {format(day, 'd')}
        </span>
        <button
          type="button"
          onClick={onAdd}
          aria-label={`Add a task on ${format(day, 'EEEE, MMMM d')}`}
          className="rounded p-0.5 text-ink-faint opacity-0 group-hover:opacity-100 hover:bg-surface-sunken hover:text-ink-soft focus:opacity-100"
        >
          <Plus className="size-4" aria-hidden />
        </button>
      </div>

      <ul className="flex min-w-0 flex-col gap-1">
        {shown.map((task) => (
          <li key={task.id} className="min-w-0">
            <TaskChip
              task={task}
              selected={task.id === selectedId}
              dimmed={task.id === draggingId}
              onOpen={() => onOpenTask(task.id)}
            />
          </li>
        ))}
      </ul>

      {hidden > 0 && (
        <button
          type="button"
          onClick={onShowMore}
          className="self-start rounded px-1 text-xs font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink-soft"
        >
          +{hidden} more
        </button>
      )}
    </div>
  );
}
