import { useState, type FormEvent, type Ref } from 'react';
import { Plus } from 'lucide-react';
import { useCreateTask, type NewTask, type TaskView } from '../../api/tasks';
import { todayAllDay } from '../../lib/dates';

type QuickAddProps = {
  view: TaskView;
  listId?: string;
  placeholder: string;
  // Lets the view focus this box (the "n" shortcut).
  inputRef?: Ref<HTMLInputElement>;
};

// The "Add a task" box at the top of a view. Press Enter to add; the box
// clears straight away so several tasks can be typed in a row.
export function QuickAdd({
  view,
  listId,
  placeholder,
  inputRef,
}: QuickAddProps) {
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
      className="flex items-center gap-2 rounded-lg border border-line bg-surface-muted px-3 py-2 focus-within:border-accent-line focus-within:bg-surface focus-within:ring-2 focus-within:ring-accent-muted"
    >
      <Plus className="size-4 text-ink-faint" aria-hidden />
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={placeholder}
        aria-label="New task title"
        maxLength={500}
        className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
      />
    </form>
  );
}
