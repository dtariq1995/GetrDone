import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { closestCorners, DndContext, type DragEndEvent } from '@dnd-kit/core';
import { CircleAlert, FolderX, Plus } from 'lucide-react';
import { useLists } from '../../api/lists';
import {
  useCreateSection,
  useDeleteSection,
  useRenameSection,
  useSections,
  type Section,
} from '../../api/sections';
import { useTasks, useUpdateTask } from '../../api/tasks';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { Modal } from '../../components/Modal';
import { TextField } from '../../components/TextField';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useSortableSensors } from '../../lib/useSortableSensors';
import { ListLayoutToggle } from '../lists/ListLayoutToggle';
import { useSelectedTask } from '../tasks/useSelectedTask';
import { KanbanColumn } from './KanbanColumn';
import { buildColumns, dropResult } from './board';

// /lists/:listId/board. key={listId} starts fresh when switching lists.
export function KanbanRoute() {
  const { listId = '' } = useParams();
  return <KanbanView key={listId} listId={listId} />;
}

function KanbanView({ listId }: { listId: string }) {
  const lists = useLists();
  const sections = useSections(listId);
  // The same query (and cache entry) as the list view, so changes made in
  // one show up in the other.
  const tasks = useTasks({ view: 'list', listId, sort: 'manual' });
  const updateTask = useUpdateTask();
  const sensors = useSortableSensors();
  const { selectedId, open } = useSelectedTask();
  const [renaming, setRenaming] = useState<Section | null>(null);
  const [deleting, setDeleting] = useState<Section | null>(null);
  const deleteSection = useDeleteSection(listId);

  const list = lists.data?.find((l) => l.id === listId);
  useDocumentTitle(list && `${list.name} board`);
  if (lists.isSuccess && !list) {
    return (
      <EmptyState
        icon={FolderX}
        title="List not found"
        message="It may have been deleted."
      >
        <Link
          to="/inbox"
          className="font-medium text-accent-ink hover:underline"
        >
          Go to Inbox
        </Link>
      </EmptyState>
    );
  }

  // The board shows unfinished tasks; finished ones are in the list view.
  const columns = buildColumns(
    sections.data ?? [],
    (tasks.data ?? []).filter((t) => !t.completedAt),
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    const result = dropResult(
      columns,
      String(active.id),
      over ? String(over.id) : null,
    );
    if (result) {
      // Optimistic: the card stays where it was dropped while this saves.
      updateTask.mutate({ id: String(active.id), changes: result });
    }
  }

  const failed =
    (!tasks.data && tasks.isError) || (!sections.data && sections.isError);

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line-subtle px-6 py-5">
        <h1 className="flex items-center gap-2 text-xl font-semibold text-ink">
          {list && (
            <span
              className="size-3 rounded-full"
              style={{ backgroundColor: list.color }}
              aria-hidden
            />
          )}
          {list?.name}
        </h1>
        <ListLayoutToggle listId={listId} />
      </header>

      {failed ? (
        <EmptyState icon={CircleAlert} title="Couldn’t load the board">
          <button
            type="button"
            onClick={() => {
              void tasks.refetch();
              void sections.refetch();
            }}
            className="font-medium text-accent-ink hover:underline"
          >
            Try again
          </button>
        </EmptyState>
      ) : tasks.isPending || sections.isPending ? (
        <div
          className="flex gap-4 p-6"
          aria-busy="true"
          aria-label="Loading board"
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-64 w-72 animate-pulse rounded-xl bg-surface-sunken"
            />
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          // closestCorners works better than the default for columns side by
          // side: it picks the card or column nearest the dragged card.
          collisionDetection={closestCorners}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-1 items-start gap-4 overflow-x-auto p-6">
            {columns.map((column) => {
              const section = sections.data?.find(
                (s) => s.id === column.sectionId,
              );
              return (
                <KanbanColumn
                  key={column.sectionId ?? 'none'}
                  column={column}
                  listId={listId}
                  selectedId={selectedId}
                  onOpenTask={open}
                  onRename={section && (() => setRenaming(section))}
                  onDelete={section && (() => setDeleting(section))}
                />
              );
            })}
            <AddSection listId={listId} />
          </div>
        </DndContext>
      )}

      {renaming && (
        <RenameSectionDialog
          listId={listId}
          section={renaming}
          onClose={() => setRenaming(null)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete section?"
          message={`“${deleting.name}” will be removed. Its tasks move to “No section”.`}
          confirmLabel="Delete section"
          pending={deleteSection.isPending}
          onCancel={() => setDeleting(null)}
          onConfirm={() =>
            deleteSection.mutate(deleting.id, {
              onSuccess: () => setDeleting(null),
            })
          }
        />
      )}
    </div>
  );
}

// The "+ Add section" column at the end of the board.
function AddSection({ listId }: { listId: string }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const createSection = useCreateSection(listId);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setAdding(false);
      return;
    }
    createSection.mutate(trimmed, {
      onSuccess: () => {
        setName('');
        setAdding(false);
      },
    });
  }

  if (!adding) {
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="flex w-72 shrink-0 items-center gap-1.5 rounded-xl border-2 border-dashed border-line px-3 py-3 text-sm font-medium text-ink-muted hover:border-line-strong hover:text-ink-soft"
      >
        <Plus className="size-4" aria-hidden />
        Add section
      </button>
    );
  }
  return (
    <form onSubmit={handleSubmit} className="w-72 shrink-0">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => !name.trim() && setAdding(false)}
        onKeyDown={(e) => e.key === 'Escape' && setAdding(false)}
        placeholder="Section name, then Enter"
        aria-label="New section name"
        maxLength={100}
        className="w-full rounded-xl border border-accent-line bg-surface px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-accent-muted"
      />
    </form>
  );
}

function RenameSectionDialog({
  listId,
  section,
  onClose,
}: {
  listId: string;
  section: Section;
  onClose: () => void;
}) {
  const [name, setName] = useState(section.name);
  const [error, setError] = useState<string>();
  const renameSection = useRenameSection(listId);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Give the section a name.');
      return;
    }
    renameSection.mutate(
      { id: section.id, name: trimmed },
      { onSuccess: onClose },
    );
  }

  return (
    <Modal title="Rename section" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <TextField
          label="Name"
          autoFocus
          maxLength={100}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(undefined);
          }}
          error={error}
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-ink-soft hover:bg-surface-sunken"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={renameSection.isPending}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-60"
          >
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}
