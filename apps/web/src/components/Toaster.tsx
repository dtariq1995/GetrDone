import { CircleAlert, X } from 'lucide-react';
import { dismissToast, useToasts } from '../lib/toast';

// Renders the error toasts from lib/toast.ts, bottom-centre of the screen.
export function Toaster() {
  const toasts = useToasts();

  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className="pointer-events-auto flex max-w-md items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg ring-1 ring-white/10 motion-safe:animate-fade-in"
        >
          <CircleAlert className="size-4 shrink-0 text-red-400" aria-hidden />
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss"
            className="rounded p-0.5 text-slate-400 hover:text-white"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
