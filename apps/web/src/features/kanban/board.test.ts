import { describe, expect, it } from 'vitest';
import { makeTask } from '../../test/helpers';
import { buildColumns, columnDropId, dropResult } from './board';

const sections = [
  { id: 'doing', listId: 'l', name: 'Doing', position: 2 },
  { id: 'todo', listId: 'l', name: 'To do', position: 1 },
];

const task = (id: string, sectionId: string | null, position: number) =>
  makeTask({ id, title: id, sectionId, position });

// To do: a(1) b(2) c(3) | Doing: d(1) | No section: e(5)
const tasks = [
  task('c', 'todo', 3),
  task('a', 'todo', 1),
  task('b', 'todo', 2),
  task('d', 'doing', 1),
  task('e', null, 5),
];
const columns = buildColumns(sections, tasks);

describe('buildColumns', () => {
  it('puts "No section" first, then sections and tasks in position order', () => {
    expect(
      columns.map((c) => [c.name, c.tasks.map((t) => t.id).join('')]),
    ).toEqual([
      ['No section', 'e'],
      ['To do', 'abc'],
      ['Doing', 'd'],
    ]);
  });

  it('shows a task whose section is unknown under "No section"', () => {
    const cols = buildColumns([], [task('x', 'deleted-section', 1)]);
    expect(cols[0].tasks.map((t) => t.id)).toEqual(['x']);
  });
});

describe('dropResult', () => {
  it('moves a card down within a column to after the hovered card', () => {
    // a onto c: a lands after c → position past c.
    expect(dropResult(columns, 'a', 'c')).toEqual({
      sectionId: 'todo',
      position: 4,
    });
  });

  it('moves a card up within a column to before the hovered card', () => {
    // c onto b: order a c b → between a(1) and b(2).
    expect(dropResult(columns, 'c', 'b')).toEqual({
      sectionId: 'todo',
      position: 1.5,
    });
  });

  it('inserts before the hovered card in another column', () => {
    // b onto d (Doing): b goes before d → d.position - 1.
    expect(dropResult(columns, 'b', 'd')).toEqual({
      sectionId: 'doing',
      position: 0,
    });
  });

  it('appends when dropped on a column’s empty space', () => {
    expect(dropResult(columns, 'a', columnDropId('doing'))).toEqual({
      sectionId: 'doing',
      position: 2,
    });
    expect(dropResult(columns, 'd', columnDropId(null))).toEqual({
      sectionId: null,
      position: 6,
    });
  });

  it('returns null when nothing changes', () => {
    expect(dropResult(columns, 'a', 'a')).toBeNull();
    expect(dropResult(columns, 'a', null)).toBeNull();
    // c is already last in its column.
    expect(dropResult(columns, 'c', columnDropId('todo'))).toBeNull();
  });
});
