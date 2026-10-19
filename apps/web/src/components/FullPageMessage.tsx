import type { ReactNode } from 'react';

// A centered message for whole-screen states: loading, errors, 404.
export function FullPageMessage({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center text-slate-600">
      {children}
    </main>
  );
}
