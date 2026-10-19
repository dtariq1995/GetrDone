import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  addDays,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfDay,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTasks, useUpdateTask, type Task } from '../../api/tasks';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useShortcut } from '../../lib/useShortcut';
import { useSelectedTask } from '../tasks/useSelectedTask';
import { AddTaskOnDayDialog } from './AddTaskOnDayDialog';
import { DayCell } from './DayCell';
import { TaskChip } from './TaskChip';
import {
  dayKey,
  groupByDay,
  moveToDay,
  rangeTitle,
  shiftCursor,
  visibleDays,
  type CalendarMode,
} from './calendar';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarView() {
  const [mode, setMode] = useState<CalendarMode>('month');
  const [cursor, setCursor] = useState(() => new Date());
  const [addingOn, setAddingOn] = useState<Date | null>(null);
  const [dragging, setDragging] = useState<Task | null>(null);

  const days = visibleDays(mode, cursor);
  // Only fetch tasks due inside the visible grid.
  const tasks = useTasks({
    view: 'all',
    sort: 'due',
    from: startOfDay(days[0]).toISOString(),
    to: addDays(startOfDay(days[days.length - 1]), 1).toISOString(),
  });
  const byDay = groupByDay(tasks.data ?? []);
  const updateTask = useUpdateTask();
  const { selectedId, open } = useSelectedTask();
  useDocumentTitle('Calendar');
  // "n" adds a task on today.
  useShortcut('n', () => setAddingOn(new Date()));

  const sensors = useSensors(
    // A drag only starts after the pointer moves 5px, so a plain click on a
    // task still opens it.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    // Keyboard dragging: Space picks a task up, arrow keys move it, Space or
    // Enter drops it, Escape cancels. (Enter alone opens the task.)
    useSensor(KeyboardSensor, {
      keyboardCodes: {
        start: ['Space'],
        cancel: ['Escape'],
        end: ['Space', 'Enter'],
      },
    }),
  );

  function handleDragStart(event: DragStartEvent) {
    setDragging((event.active.data.current?.task as Task | undefined) ?? null);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setDragging(null);
    const task = active.data.current?.task as Task | undefined;
    if (!task || !over) {
      return;
    }
    // Drop targets are identified by their "yyyy-MM-dd" key.
    const day = parseISO(String(over.id));
    if (task.dueAt && isSameDay(new Date(task.dueAt), day)) {
      return;
    }
    // useUpdateTask is optimistic, so the task moves to the new day at once
    // and moves back (with an error toast) if the server refuses.
    updateTask.mutate({ id: task.id, changes: moveToDay(task, day) });
  }

  // "+N more" in a month cell zooms into that day's week.
  function showWeekOf(day: Date) {
    setMode('week');
    setCursor(day);
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line-subtle px-6 py-5">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-ink">
            {rangeTitle(mode, cursor)}
          </h1>
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setCursor(shiftCursor(mode, cursor, -1))}
              aria-label={mode === 'month' ? 'Previous month' : 'Previous week'}
              className="rounded-md p-1.5 text-ink-muted hover:bg-surface-sunken"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setCursor(new Date())}
              className="rounded-md px-2 py-1 text-sm font-medium text-ink-soft hover:bg-surface-sunken"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setCursor(shiftCursor(mode, cursor, 1))}
              aria-label={mode === 'month' ? 'Next month' : 'Next week'}
              className="rounded-md p-1.5 text-ink-muted hover:bg-surface-sunken"
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </div>
        </div>

        <div
          role="group"
          aria-label="Calendar range"
          className="flex rounded-lg border border-line p-0.5"
        >
          {(['month', 'week'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`rounded-md px-3 py-1 text-sm font-medium capitalize transition ${
                mode === m
                  ? 'bg-accent text-white'
                  : 'text-ink-soft hover:bg-surface-sunken'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </header>

      {!tasks.data && tasks.isError && (
        <p
          role="alert"
          className="bg-danger-subtle px-6 py-2 text-sm text-danger"
        >
          Couldn’t load tasks.{' '}
          <button
            type="button"
            onClick={() => void tasks.refetch()}
            className="font-medium underline"
          >
            Try again
          </button>
        </p>
      )}

      {/* DndContext also announces pick-up, moves and drops to screen
          readers. */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDragging(null)}
      >
        <div className="grid grid-cols-7 border-b border-line text-xs font-medium tracking-wide text-ink-muted uppercase">
          {WEEKDAYS.map((name) => (
            <div key={name} className="px-2 py-2">
              {name}
            </div>
          ))}
        </div>
        <div
          className={`grid flex-1 grid-cols-7 ${
            mode === 'month' ? 'auto-rows-fr' : ''
          }`}
          aria-busy={tasks.isPending}
        >
          {days.map((day) => (
            <DayCell
              key={dayKey(day)}
              day={day}
              tasks={byDay.get(dayKey(day)) ?? []}
              // Month view shows a few tasks per day; week view shows all.
              maxVisible={mode === 'month' ? 3 : Infinity}
              faded={mode === 'month' && !isSameMonth(day, cursor)}
              today={isToday(day)}
              selectedId={selectedId}
              draggingId={dragging?.id}
              onOpenTask={open}
              onAdd={() => setAddingOn(day)}
              onShowMore={() => showWeekOf(day)}
            />
          ))}
        </div>

        {/* The copy of the chip that follows the pointer while dragging. */}
        <DragOverlay dropAnimation={null}>
          {dragging && <TaskChip task={dragging} overlay />}
        </DragOverlay>
      </DndContext>

      {addingOn && (
        <AddTaskOnDayDialog day={addingOn} onClose={() => setAddingOn(null)} />
      )}
    </div>
  );
}
