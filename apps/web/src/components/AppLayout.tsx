import { useCallback, useState } from 'react';
import { Outlet } from 'react-router';
import { CircleCheckBig, Menu } from 'lucide-react';
import { TaskDetailPanel } from '../features/tasks/TaskDetailPanel';
import { useSelectedTask } from '../features/tasks/useSelectedTask';
import { useShortcut } from '../lib/useShortcut';
import { ShortcutsDialog } from './ShortcutsDialog';
import { Sidebar } from './Sidebar';

// The logged-in app: sidebar on the left, the current view in the middle,
// and the task detail panel on the right when a task is open.
// Below the md breakpoint (768px) the sidebar becomes a slide-over menu and
// the task panel covers the screen.
export function AppLayout() {
  const { selectedId, close } = useSelectedTask();
  const [menuOpen, setMenuOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const showShortcuts = useCallback(() => setShortcutsOpen(true), []);
  useShortcut('?', showShortcuts);

  return (
    <div className="flex h-dvh overflow-hidden bg-surface text-ink">
      <div className="hidden md:flex">
        <Sidebar onShowShortcuts={showShortcuts} />
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40 motion-safe:animate-fade-in"
            onClick={() => setMenuOpen(false)}
            aria-hidden
          />
          <div className="relative flex motion-safe:animate-fade-in">
            <Sidebar
              onShowShortcuts={showShortcuts}
              onClose={() => setMenuOpen(false)}
            />
          </div>
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="rounded-md p-1 text-ink-soft hover:bg-surface-sunken"
          >
            <Menu className="size-5" aria-hidden />
          </button>
          <CircleCheckBig className="size-5 text-accent-ink" aria-hidden />
          <span className="font-semibold">GetrDone</span>
        </div>
        <Outlet />
      </main>

      {selectedId && (
        <TaskDetailPanel key={selectedId} taskId={selectedId} onClose={close} />
      )}
      {shortcutsOpen && (
        <ShortcutsDialog onClose={() => setShortcutsOpen(false)} />
      )}
    </div>
  );
}
