import { arrayMove } from '@dnd-kit/sortable';
import type { Section } from '../../api/sections';
import type { Task } from '../../api/tasks';
import { positionBetween } from '../../lib/position';

// The board's logic as plain functions, unit tested in board.test.ts.

export type Column = {
  // null is the "No section" column.
  sectionId: string | null;
  name: string;
  tasks: Task[];
};

// Drop-target id for a column's empty space (cards use their task id).
export function columnDropId(sectionId: string | null): string {
  return `column:${sectionId ?? 'none'}`;
}

const byPosition = (a: { position: number }, b: { position: number }) =>
  a.position - b.position;

// "No section" first, then each section in order. Tasks are sorted here
// (not trusted from the server's order) so an optimistic position change
// shows straight away.
export function buildColumns(sections: Section[], tasks: Task[]): Column[] {
  const columns: Column[] = [
    { sectionId: null, name: 'No section', tasks: [] },
    ...[...sections]
      .sort(byPosition)
      .map((s) => ({ sectionId: s.id, name: s.name, tasks: [] as Task[] })),
  ];
  for (const task of tasks) {
    // A task whose section isn't loaded (yet) shows under "No section".
    const column =
      columns.find((c) => c.sectionId === task.sectionId) ?? columns[0];
    column.tasks.push(task);
  }
  for (const column of columns) {
    column.tasks.sort(byPosition);
  }
  return columns;
}

// Where a card dropped on `overId` (a card or a column's empty space) should
// go: its new section and a position between its new neighbours. null when
// nothing changes.
export function dropResult(
  columns: Column[],
  activeId: string,
  overId: string | null,
): { sectionId: string | null; position: number } | null {
  if (!overId || overId === activeId) return null;

  const from = columns.find((c) => c.tasks.some((t) => t.id === activeId));
  const to = columns.find(
    (c) =>
      columnDropId(c.sectionId) === overId ||
      c.tasks.some((t) => t.id === overId),
  );
  if (!from || !to) return null;

  const active = from.tasks.find((t) => t.id === activeId)!;
  const onEmptySpace = columnDropId(to.sectionId) === overId;
  const overIndex = to.tasks.findIndex((t) => t.id === overId);

  let ordered: Task[];
  if (from === to) {
    // Same column: the same reordering the sortable list showed while
    // dragging (moving down lands after the hovered card, up lands before).
    const oldIndex = to.tasks.indexOf(active);
    const newIndex = onEmptySpace ? to.tasks.length - 1 : overIndex;
    if (oldIndex === newIndex) return null;
    ordered = arrayMove(to.tasks, oldIndex, newIndex);
  } else {
    // Another column: insert before the hovered card, or at the end.
    const insertAt = onEmptySpace ? to.tasks.length : overIndex;
    ordered = [
      ...to.tasks.slice(0, insertAt),
      active,
      ...to.tasks.slice(insertAt),
    ];
  }

  const i = ordered.indexOf(active);
  return {
    sectionId: to.sectionId,
    position: positionBetween(
      ordered[i - 1]?.position,
      ordered[i + 1]?.position,
    ),
  };
}
