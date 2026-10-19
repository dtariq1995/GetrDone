import { Flag } from 'lucide-react';
import { priorityStyle } from '../lib/priority';

export function PriorityFlag({ priority }: { priority: number }) {
  if (priority === 0) {
    return null;
  }
  const style = priorityStyle(priority);
  return (
    <Flag
      className={`size-4 shrink-0 fill-current ${style.text}`}
      aria-label={`${style.label} priority`}
    />
  );
}
