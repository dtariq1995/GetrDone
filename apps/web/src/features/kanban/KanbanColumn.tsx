import { useState, type FormEvent } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useCreateTask } from '../../api/tasks';
import { KanbanCard } from './KanbanCard';
import { columnDropId, type Column } from './board';

type KanbanColumnProps = {
  column: Column;
  listId: string;
  selectedId: string | null;
  onOpenTask: (id: string) => void;
  // Not offered for the built-in "No section" column.
  onRename?: () => void;
  onDelete?: () => void;
};

export function KanbanColumn({
  column,
  listId,
  selectedId,
  onOpenTask,
  onRename,
  onDelete,
}: KanbanColumnProps) {
  // The column itself is a drop target too, so a card can be dropped into
  // an empty column or below the last card.
  const { setNodeRef, isOver } = useDroppable({
    id: columnDropId(column.sectionId),
  });
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const createTask = useCreateTask();

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setAdding(false);
      return;
    }
    createTask.mutate({ title: trimmed, listId, sectionId: column.sectionId });
    setTitle('');
  }

  return (
    <section
      aria-label={column.name}
      className="flex w-72 shrink-0 flex-col rounded-xl bg-surface-sunken/80"
    >
      <header className="group flex items-center gap-2 px-3 pt-3 pb-2">
        <h2 className="truncate text-sm font-semibold text-ink-soft">
          {column.name}
        </h2>
        <span className="text-xs text-ink-faint">{column.tasks.length}</span>
        {onRename && onDelete && (
          <div className="ml-auto flex opacity-0 group-hover:opacity-100 focus-within:opacity-100">
            <button
              type="button"
              onClick={onRename}
              aria-label={`Rename section “${column.name}”`}
              className="rounded p-1 text-ink-faint hover:bg-surface-strong hover:text-ink-soft"
            >
              <Pencil className="size-3.5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={onDelete}
              aria-label={`Delete section “${column.name}”`}
              className="rounded p-1 text-ink-faint hover:bg-surface-strong hover:text-danger"
            >
              <Trash2 className="size-3.5" aria-hidden />
            </button>
          </div>
        )}
      </header>

      <SortableContext
        items={column.tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul
          ref={setNodeRef}
          className={`flex min-h-16 flex-1 flex-col gap-2 rounded-lg px-2 pb-2 transition ${
            isOver ? 'bg-accent-subtle' : ''
          }`}
        >
          {column.tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              selected={task.id === selectedId}
              onOpen={() => onOpenTask(task.id)}
            />
          ))}
        </ul>
      </SortableContext>

      <div className="px-2 pb-2">
        {adding ? (
          <form onSubmit={handleAdd}>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => !title.trim() && setAdding(false)}
              onKeyDown={(e) => e.key === 'Escape' && setAdding(false)}
              placeholder="Task title, then Enter"
              aria-label={`New task in ${column.name}`}
              maxLength={500}
              className="w-full rounded-lg border border-accent-line bg-surface px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-accent-muted"
            />
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-ink-muted hover:bg-surface-strong/70 hover:text-ink-soft"
          >
            <Plus className="size-4" aria-hidden />
            Add task
          </button>
        )}
      </div>
    </section>
  );
}
