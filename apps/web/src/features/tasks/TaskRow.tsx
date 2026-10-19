import { CalendarDays, ListChecks, NotebookText } from 'lucide-react';
import type { List } from '../../api/lists';
import { useUpdateTask, type Task } from '../../api/tasks';
import { Checkbox } from '../../components/Checkbox';
import { PriorityFlag } from '../../components/PriorityFlag';
import { formatDue, isOverdue } from '../../lib/dates';

type TaskRowProps = {
  task: Task;
  // Shown as a label in views that mix lists (Today, All...).
  list?: List;
  selected: boolean;
  onOpen: () => void;
};

export function TaskRow({ task, list, selected, onOpen }: TaskRowProps) {
  const updateTask = useUpdateTask();
  const done = task.completedAt !== null;
  const overdue = isOverdue(task);
  const subtasksDone = task.subtasks.filter((s) => s.completedAt).length;

  return (
    <li
      className={`group flex items-start gap-3 rounded-lg px-3 py-2.5 transition ${
        selected ? 'bg-indigo-50' : 'hover:bg-slate-50'
      }`}
    >
      <div className="pt-0.5">
        <Checkbox
          checked={done}
          priority={task.priority}
          label={`Mark “${task.title}” as ${done ? 'not done' : 'done'}`}
          onChange={(completed) =>
            updateTask.mutate({ id: task.id, changes: { completed } })
          }
        />
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left"
      >
        <span
          className={`w-full truncate text-sm ${
            done ? 'text-slate-400 line-through' : 'text-slate-800'
          }`}
        >
          {task.title}
        </span>

        {(task.dueAt || list || task.subtasks.length > 0 || task.notes) && (
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            {task.dueAt && (
              <span
                className={`flex items-center gap-1 ${
                  overdue ? 'font-medium text-red-600' : ''
                }`}
              >
                <CalendarDays className="size-3.5" aria-hidden />
                {formatDue(task.dueAt, task.isAllDay)}
                {overdue && <span className="sr-only">(overdue)</span>}
              </span>
            )}
            {task.subtasks.length > 0 && (
              <span
                className="flex items-center gap-1"
                aria-label={`${subtasksDone} of ${task.subtasks.length} subtasks done`}
              >
                <ListChecks className="size-3.5" aria-hidden />
                {subtasksDone}/{task.subtasks.length}
              </span>
            )}
            {task.notes && (
              <NotebookText className="size-3.5" aria-label="Has notes" />
            )}
            {list && (
              <span className="flex items-center gap-1">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: list.color }}
                  aria-hidden
                />
                {list.name}
              </span>
            )}
          </span>
        )}
      </button>

      <div className="pt-0.5">
        <PriorityFlag priority={task.priority} />
      </div>
    </li>
  );
}
