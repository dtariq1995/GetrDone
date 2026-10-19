import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { useCreateTask, type NewTask, type TaskView } from '../../api/tasks';
import { todayAllDay } from '../../lib/dates';

type QuickAddProps = {
  view: TaskView;
  listId?: string;
  placeholder: string;
};

// The "Add a task" box at the top of a view. Press Enter to add; the box
// clears straight away so several tasks can be typed in a row.
export function QuickAdd({ view, listId, placeholder }: QuickAddProps) {
  const [title, setTitle] = useState('');
  const createTask = useCreateTask();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }

    // A new task should appear in the view it was added from: in a list view
    // it goes into that list; in Today / Next 7 Days it's due today.
    const task: NewTask = { title: trimmed };
    if (view === 'list') {
      task.listId = listId;
    }
    if (view === 'today' || view === 'next7') {
      Object.assign(task, todayAllDay());
    }

    createTask.mutate(task);
    setTitle('');
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-indigo-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100"
    >
      <Plus className="size-4 text-slate-400" aria-hidden />
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={placeholder}
        aria-label="New task title"
        maxLength={500}
        className="flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
      />
    </form>
  );
}
