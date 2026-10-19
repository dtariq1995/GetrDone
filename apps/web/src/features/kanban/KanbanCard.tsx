import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CalendarDays, ListChecks } from 'lucide-react';
import { useUpdateTask, type Task } from '../../api/tasks';
import { Checkbox } from '../../components/Checkbox';
import { DragHandle } from '../../components/DragHandle';
import { PriorityFlag } from '../../components/PriorityFlag';
import { formatDue, isOverdue } from '../../lib/dates';

type KanbanCardProps = {
  task: Task;
  selected: boolean;
  onOpen: () => void;
};

// A task on the board. Drag it by its grip to reorder it in its column or
// move it to another; click it to open it.
export function KanbanCard({ task, selected, onOpen }: KanbanCardProps) {
  const updateTask = useUpdateTask();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });
  const subtasksDone = task.subtasks.filter((s) => s.completedAt).length;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group flex items-start gap-2 rounded-lg border bg-white p-2.5 shadow-sm ${
        isDragging
          ? 'relative z-10 border-indigo-300 shadow-lg'
          : selected
            ? 'border-indigo-300'
            : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="-ml-1 pt-0.5">
        <DragHandle
          label={`Move “${task.title}”`}
          attributes={attributes}
          listeners={listeners}
          setRef={setActivatorNodeRef}
        />
      </div>
      <div className="pt-0.5">
        <Checkbox
          checked={false}
          priority={task.priority}
          label={`Mark “${task.title}” as done`}
          onChange={() =>
            updateTask.mutate({ id: task.id, changes: { completed: true } })
          }
        />
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 flex-col items-start gap-1.5 text-left"
      >
        <span className="w-full text-sm break-words text-slate-800">
          {task.title}
        </span>
        {(task.dueAt || task.subtasks.length > 0) && (
          <span className="flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
            {task.dueAt && (
              <span
                className={`flex items-center gap-1 ${
                  isOverdue(task) ? 'font-medium text-red-600' : ''
                }`}
              >
                <CalendarDays className="size-3.5" aria-hidden />
                {formatDue(task.dueAt, task.isAllDay)}
              </span>
            )}
            {task.subtasks.length > 0 && (
              <span className="flex items-center gap-1">
                <ListChecks className="size-3.5" aria-hidden />
                {subtasksDone}/{task.subtasks.length}
              </span>
            )}
          </span>
        )}
      </button>
      <PriorityFlag priority={task.priority} />
    </li>
  );
}
