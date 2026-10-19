import { Outlet } from 'react-router';
import { TaskDetailPanel } from '../features/tasks/TaskDetailPanel';
import { useSelectedTask } from '../features/tasks/useSelectedTask';
import { Sidebar } from './Sidebar';

// The logged-in app: sidebar on the left, the current view in the middle,
// and the task detail panel on the right when a task is open.
export function AppLayout() {
  const { selectedId, close } = useSelectedTask();

  return (
    <div className="flex h-screen overflow-hidden bg-white text-slate-800">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
      {selectedId && (
        <TaskDetailPanel key={selectedId} taskId={selectedId} onClose={close} />
      )}
    </div>
  );
}
