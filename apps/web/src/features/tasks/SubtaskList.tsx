import { useState, type FormEvent } from 'react';
import { Plus, X } from 'lucide-react';
import {
  useCreateTask,
  useDeleteTask,
  useUpdateTask,
  type Task,
} from '../../api/tasks';
import { Checkbox } from '../../components/Checkbox';

// The checklist in the task detail panel.
export function SubtaskList({ task }: { task: Task }) {
  const [title, setTitle] = useState('');
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const doneCount = task.subtasks.filter((s) => s.completedAt).length;

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }
    createTask.mutate({ title: trimmed, parentId: task.id });
    setTitle('');
  }

  return (
    <section>
      <h3 className="mb-2 text-xs font-medium tracking-wide text-slate-500 uppercase">
        Subtasks
        {task.subtasks.length > 0 && (
          <span className="ml-1 normal-case">
            ({doneCount}/{task.subtasks.length})
          </span>
        )}
      </h3>

      <ul className="flex flex-col">
        {task.subtasks.map((subtask) => {
          const done = subtask.completedAt !== null;
          return (
            <li
              key={subtask.id}
              className="group flex items-center gap-2 rounded-md px-1 py-1.5 hover:bg-slate-50"
            >
              <Checkbox
                size="sm"
                checked={done}
                label={`Mark “${subtask.title}” as ${done ? 'not done' : 'done'}`}
                onChange={(completed) =>
                  updateTask.mutate({ id: subtask.id, changes: { completed } })
                }
              />
              <span
                className={`flex-1 text-sm ${
                  done ? 'text-slate-400 line-through' : 'text-slate-700'
                }`}
              >
                {subtask.title}
              </span>
              <button
                type="button"
                onClick={() => deleteTask.mutate(subtask.id)}
                aria-label={`Delete subtask “${subtask.title}”`}
                className="rounded p-0.5 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-600 focus:opacity-100"
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>

      <form onSubmit={handleAdd} className="mt-1 flex items-center gap-2 px-1">
        <Plus className="size-4 text-slate-400" aria-hidden />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a subtask"
          aria-label="New subtask title"
          maxLength={500}
          className="flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-slate-400"
        />
      </form>
    </section>
  );
}
