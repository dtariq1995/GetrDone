// Priority is stored as a number (0 none, 1 low, 2 medium, 3 high). The
// colour classes are written out in full so Tailwind can find them when it
// scans the source.
export const PRIORITIES = [
  { value: 3, label: 'High', text: 'text-red-500', border: 'border-red-500' },
  {
    value: 2,
    label: 'Medium',
    text: 'text-amber-500',
    border: 'border-amber-500',
  },
  { value: 1, label: 'Low', text: 'text-sky-500', border: 'border-sky-500' },
  {
    value: 0,
    label: 'None',
    text: 'text-ink-faint',
    border: 'border-line-strong',
  },
] as const;

export function priorityStyle(priority: number) {
  return PRIORITIES.find((p) => p.value === priority) ?? PRIORITIES[3];
}
