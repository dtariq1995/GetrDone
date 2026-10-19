// Tasks and sections are ordered by a float `position`. To move an item
// between two neighbours, give it a position halfway between theirs, so only
// the moved item is updated (1 and 2 → 1.5). At the ends, step one past the
// neighbour.
export function positionBetween(before?: number, after?: number): number {
  if (before === undefined && after === undefined) return 0;
  if (before === undefined) return after! - 1;
  if (after === undefined) return before + 1;
  return (before + after) / 2;
}
