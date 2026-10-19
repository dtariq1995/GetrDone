import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  message?: string;
  children?: ReactNode;
};

// Shown in place of a list when there's nothing to show (or it failed to
// load), so a view is never just blank.
export function EmptyState({
  icon: Icon,
  title,
  message,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 rounded-full bg-accent-subtle p-4 text-accent-ink">
        <Icon className="size-8" aria-hidden />
      </div>
      <p className="font-medium text-ink">{title}</p>
      {message && <p className="mt-1 text-sm text-ink-muted">{message}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
