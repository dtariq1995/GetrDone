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
      <div className="mb-4 rounded-full bg-indigo-50 p-4 text-indigo-500">
        <Icon className="size-8" aria-hidden />
      </div>
      <p className="font-medium text-slate-800">{title}</p>
      {message && <p className="mt-1 text-sm text-slate-500">{message}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
