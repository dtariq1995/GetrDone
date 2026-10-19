import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Flag, Trash2, X } from 'lucide-react';
import { ApiError } from '../../api/client';
import { useLists } from '../../api/lists';
import {
  useDeleteTask,
  useTask,
  useUpdateTask,
  type Task,
  type TaskChanges,
} from '../../api/tasks';
import { Checkbox } from '../../components/Checkbox';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DatePicker } from '../../components/DatePicker';
import { PRIORITIES } from '../../lib/priority';
import { SubtaskList } from './SubtaskList';

type TaskDetailPanelProps = {
  taskId: string;
  onClose: () => void;
};

// The right-hand panel for editing one task. AppLayout gives it key={taskId},
// so opening a different task starts with fresh state.
export function TaskDetailPanel({ taskId, onClose }: TaskDetailPanelProps) {
  const task = useTask(taskId);

  // Escape closes the panel (unless a dialog is open; Escape closes that).
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !document.querySelector('dialog[open]')) {
        // Blur first, so a title or note being typed is saved by its onBlur
        // handler. Removing a focused field from the page doesn't fire blur.
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <aside
      aria-label="Task details"
      className="flex w-96 shrink-0 flex-col border-l border-slate-200 bg-white"
    >
      {task.isPending ? (
        <div className="flex flex-col gap-3 p-6" aria-busy="true">
          <div className="h-6 w-2/3 animate-pulse rounded bg-slate-100" />
          <div className="h-24 animate-pulse rounded bg-slate-100" />
        </div>
      ) : !task.data ? (
        <div className="flex flex-col items-start gap-3 p-6 text-sm text-slate-600">
          <p>
            {task.error instanceof ApiError && task.error.status === 404
              ? 'This task doesn’t exist anymore.'
              : 'Couldn’t load this task.'}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="font-medium text-indigo-600 hover:underline"
          >
            Close
          </button>
        </div>
      ) : (
        <TaskDetails task={task.data} onClose={onClose} />
      )}
    </aside>
  );
}

function TaskDetails({ task, onClose }: { task: Task; onClose: () => void }) {
  // Title and notes are edited locally and saved when the field loses focus,
  // rather than sending a request on every keystroke.
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const lists = useLists();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const change = (changes: TaskChanges) =>
    updateTask.mutate({ id: task.id, changes });
  const done = task.completedAt !== null;

  function saveTitle() {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitle(task.title); // a title can't be empty; put the old one back
    } else if (trimmed !== task.title) {
      change({ title: trimmed });
    }
  }

  function saveNotes() {
    if (notes !== task.notes) {
      change({ notes });
    }
  }

  return (
    <>
      <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
        <Checkbox
          checked={done}
          priority={task.priority}
          label={`Mark as ${done ? 'not done' : 'done'}`}
          onChange={(completed) => change({ completed })}
        />
        <select
          value={task.listId ?? ''}
          onChange={(e) => change({ listId: e.target.value || null })}
          aria-label="List"
          className="min-w-0 flex-1 rounded-md bg-transparent py-1 text-sm text-slate-600 hover:bg-slate-50"
        >
          <option value="">Inbox</option>
          {lists.data?.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close task details"
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          aria-label="Title"
          maxLength={500}
          className={`w-full text-lg font-semibold outline-none ${
            done ? 'text-slate-400 line-through' : 'text-slate-900'
          }`}
        />

        <section>
          <h3 className="mb-2 text-xs font-medium tracking-wide text-slate-500 uppercase">
            Due date
          </h3>
          <DatePicker
            dueAt={task.dueAt}
            isAllDay={task.isAllDay}
            onChange={(value) => change(value)}
          />
        </section>

        <section>
          <h3 className="mb-2 text-xs font-medium tracking-wide text-slate-500 uppercase">
            Priority
          </h3>
          <div className="flex gap-1" role="radiogroup" aria-label="Priority">
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                role="radio"
                aria-checked={task.priority === p.value}
                onClick={() => change({ priority: p.value })}
                className={`flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                  task.priority === p.value
                    ? 'border-indigo-300 bg-indigo-50 text-slate-800'
                    : 'border-transparent text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Flag
                  className={`size-3.5 ${p.text} ${p.value > 0 ? 'fill-current' : ''}`}
                  aria-hidden
                />
                {p.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-medium tracking-wide text-slate-500 uppercase">
            Notes
          </h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
            placeholder="Add notes"
            aria-label="Notes"
            rows={4}
            maxLength={10000}
            className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </section>

        <SubtaskList task={task} />
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3 text-xs text-slate-400">
        <span>Created {format(new Date(task.createdAt), 'MMM d, yyyy')}</span>
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          className="flex items-center gap-1 rounded-md px-2 py-1 font-medium text-slate-500 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="size-4" aria-hidden />
          Delete
        </button>
      </div>

      {confirmingDelete && (
        <ConfirmDialog
          title="Delete task?"
          message={
            task.subtasks.length > 0
              ? `“${task.title}” and its ${task.subtasks.length} subtasks will be deleted.`
              : `“${task.title}” will be deleted.`
          }
          confirmLabel="Delete"
          pending={deleteTask.isPending}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={() => deleteTask.mutate(task.id, { onSuccess: onClose })}
        />
      )}
    </>
  );
}
