import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  ChevronRight,
  CircleAlert,
  FolderX,
  Search,
  SearchX,
} from 'lucide-react';
import { useLists } from '../../api/lists';
import {
  useTasks,
  useUpdateTask,
  type Task,
  type TaskSort,
  type TaskView,
} from '../../api/tasks';
import { EmptyState } from '../../components/EmptyState';
import { positionBetween } from '../../lib/position';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import { useSortableSensors } from '../../lib/useSortableSensors';
import { ListLayoutToggle } from '../lists/ListLayoutToggle';
import { QuickAdd } from './QuickAdd';
import { SortableTaskRow, TaskRow } from './TaskRow';
import { useSelectedTask } from './useSelectedTask';
import { SMART_VIEWS } from './views';

const SORT_OPTIONS: { value: TaskSort; label: string }[] = [
  { value: 'manual', label: 'My order' },
  { value: 'due', label: 'Due date' },
  { value: 'priority', label: 'Priority' },
  { value: 'title', label: 'Title' },
  { value: 'created', label: 'Newest' },
];

// /lists/:listId. The key makes React start fresh (sort, search, collapsed
// state) when switching from one list to another.
export function ListTaskView() {
  const { listId } = useParams();
  return <TaskListView key={listId} view="list" listId={listId} />;
}

type TaskListViewProps = {
  view: TaskView;
  listId?: string;
};

// One component for every view (Inbox, Today, a list...). The view decides
// which tasks the API returns; this renders them.
export function TaskListView({ view, listId }: TaskListViewProps) {
  const [sort, setSort] = useState<TaskSort>('manual');
  const [search, setSearch] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const q = useDebouncedValue(search.trim());

  const lists = useLists();
  const tasks = useTasks({
    view,
    listId,
    q: q || undefined,
    sort: view === 'completed' ? undefined : sort,
  });
  const { selectedId, open } = useSelectedTask();
  const updateTask = useUpdateTask();
  const sensors = useSortableSensors();

  const smartView = SMART_VIEWS.find((v) => v.view === view);
  const list = lists.data?.find((l) => l.id === listId);
  const listsById = new Map(lists.data?.map((l) => [l.id, l]));

  if (view === 'list' && lists.isSuccess && !list) {
    return (
      <EmptyState
        icon={FolderX}
        title="List not found"
        message="It may have been deleted."
      >
        <Link
          to="/inbox"
          className="font-medium text-indigo-600 hover:underline"
        >
          Go to Inbox
        </Link>
      </EmptyState>
    );
  }

  const title = smartView?.title ?? list?.name ?? '';
  const quickAddHint =
    view === 'list'
      ? `Add a task to “${title}”`
      : view === 'today' || view === 'next7'
        ? 'Add a task due today'
        : 'Add a task to Inbox';

  const allTasks = tasks.data ?? [];
  // In the Completed view everything is done, so there's nothing to split.
  let active =
    view === 'completed' ? allTasks : allTasks.filter((t) => !t.completedAt);
  const completed =
    view === 'completed' ? [] : allTasks.filter((t) => t.completedAt);
  if (sort === 'manual' && view !== 'completed') {
    // Sorted here too, so an optimistic reorder shows before the refetch.
    // On a copy: sorting in place would change TanStack Query's cached array.
    active = [...active].sort((a, b) => a.position - b.position);
  }

  // Drag-to-reorder only where "my order" means something: one list (or
  // the Inbox), sorted manually, without a search filtering rows out.
  const canReorder =
    (view === 'list' || view === 'inbox') && sort === 'manual' && !q;

  function handleDragEnd({ active: dragged, over }: DragEndEvent) {
    if (!over || dragged.id === over.id) return;
    const oldIndex = active.findIndex((t) => t.id === dragged.id);
    const newIndex = active.findIndex((t) => t.id === over.id);
    const reordered = arrayMove(active, oldIndex, newIndex);
    // Only the moved task changes: it gets a position between its new
    // neighbours.
    updateTask.mutate({
      id: String(dragged.id),
      changes: {
        position: positionBetween(
          reordered[newIndex - 1]?.position,
          reordered[newIndex + 1]?.position,
        ),
      },
    });
  }

  const rowProps = (task: Task) => ({
    task,
    // A list label is only useful in views that mix lists.
    list: view === 'list' ? undefined : listsById.get(task.listId ?? ''),
    selected: task.id === selectedId,
    onOpen: () => open(task.id),
  });
  const renderRow = (task: Task) => (
    <TaskRow key={task.id} {...rowProps(task)} />
  );

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 flex flex-col gap-4 border-b border-slate-100 bg-white/95 px-6 pt-6 pb-4 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
            {list && (
              <span
                className="size-3 rounded-full"
                style={{ backgroundColor: list.color }}
                aria-hidden
              />
            )}
            {title}
          </h1>
          <div className="flex items-center gap-2">
            {list && <ListLayoutToggle listId={list.id} />}
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 focus-within:border-indigo-400">
              <Search className="size-4 text-slate-400" aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                aria-label="Search tasks"
                className="w-32 bg-transparent text-sm outline-none"
              />
            </label>
            {view !== 'completed' && (
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as TaskSort)}
                aria-label="Sort tasks"
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        {view !== 'completed' && (
          <QuickAdd view={view} listId={listId} placeholder={quickAddHint} />
        )}
      </header>

      <div className="flex-1 px-3 py-3">
        {/* Only show the error screen when there's nothing to show. If a
            background refetch fails, keep showing the tasks we already have
            (TanStack Query keeps the last good data). */}
        {tasks.isPending ? (
          <TaskListSkeleton />
        ) : !tasks.data ? (
          <EmptyState icon={CircleAlert} title="Couldn’t load tasks">
            <button
              type="button"
              onClick={() => void tasks.refetch()}
              className="font-medium text-indigo-600 hover:underline"
            >
              Try again
            </button>
          </EmptyState>
        ) : allTasks.length === 0 ? (
          q ? (
            <EmptyState icon={SearchX} title={`No tasks match “${q}”`} />
          ) : (
            <EmptyState
              icon={smartView?.icon ?? FolderX}
              title={smartView?.emptyTitle ?? 'This list is empty'}
              message={smartView?.emptyMessage ?? 'Add a task above.'}
            />
          )
        ) : (
          <>
            {canReorder ? (
              <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <SortableContext
                  items={active.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="flex flex-col">
                    {active.map((task) => (
                      <SortableTaskRow key={task.id} {...rowProps(task)} />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            ) : (
              <ul className="flex flex-col">{active.map(renderRow)}</ul>
            )}

            {completed.length > 0 && (
              <section className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowCompleted((shown) => !shown)}
                  aria-expanded={showCompleted}
                  className="flex items-center gap-1 px-3 py-1 text-xs font-medium tracking-wide text-slate-500 uppercase hover:text-slate-700"
                >
                  <ChevronRight
                    className={`size-4 transition ${showCompleted ? 'rotate-90' : ''}`}
                    aria-hidden
                  />
                  Completed ({completed.length})
                </button>
                {showCompleted && (
                  <ul className="flex flex-col">{completed.map(renderRow)}</ul>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TaskListSkeleton() {
  return (
    <ul
      aria-busy="true"
      aria-label="Loading tasks"
      className="flex flex-col gap-2 px-3"
    >
      {[0, 1, 2].map((i) => (
        <li key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
      ))}
    </ul>
  );
}
