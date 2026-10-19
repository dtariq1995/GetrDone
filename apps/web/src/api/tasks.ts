import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { apiFetch } from './client';

export type Subtask = {
  id: string;
  title: string;
  completedAt: string | null;
  position: number;
};

export type Task = {
  id: string;
  listId: string | null;
  sectionId: string | null;
  parentId: string | null;
  title: string;
  notes: string;
  dueAt: string | null;
  isAllDay: boolean;
  priority: number;
  completedAt: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  subtasks: Subtask[];
};

export type TaskView =
  'inbox' | 'today' | 'next7' | 'all' | 'completed' | 'list';
export type TaskSort = 'manual' | 'due' | 'priority' | 'title' | 'created';

export type TaskQuery = {
  view: TaskView;
  listId?: string;
  q?: string;
  sort?: TaskSort;
  // Due-date window (ISO strings), used by the calendar.
  from?: string;
  to?: string;
};

export type TaskCounts = { inbox: number; today: number; next7: number };

// What can be sent in a PATCH. `completed` is a boolean; the server records
// the time.
export type TaskChanges = Partial<
  Pick<
    Task,
    | 'title'
    | 'notes'
    | 'listId'
    | 'sectionId'
    | 'dueAt'
    | 'isAllDay'
    | 'priority'
    | 'position'
  >
> & { completed?: boolean };

export type NewTask = {
  title: string;
  listId?: string | null;
  sectionId?: string | null;
  parentId?: string;
  dueAt?: string;
  isAllDay?: boolean;
};

// The browser's time zone (e.g. "America/Chicago"), sent so the server
// computes "today" for this user rather than for UTC.
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

// All task queries start with 'tasks', so invalidating ['tasks'] refreshes
// every task view, the counts and any open task at once.
export const taskKeys = {
  all: ['tasks'] as const,
  lists: ['tasks', 'list'] as const,
  list: (query: TaskQuery) => ['tasks', 'list', query] as const,
  counts: ['tasks', 'counts'] as const,
  detail: (id: string) => ['tasks', 'detail', id] as const,
};

export function useTasks(query: TaskQuery) {
  return useQuery({
    queryKey: taskKeys.list(query),
    queryFn: () => {
      const params = new URLSearchParams({ view: query.view, tz: timeZone });
      if (query.listId) params.set('listId', query.listId);
      if (query.q) params.set('q', query.q);
      if (query.sort) params.set('sort', query.sort);
      if (query.from) params.set('from', query.from);
      if (query.to) params.set('to', query.to);
      return apiFetch<Task[]>(`/tasks?${params}`);
    },
  });
}

export function useTaskCounts() {
  return useQuery({
    queryKey: taskKeys.counts,
    queryFn: () =>
      apiFetch<TaskCounts>(`/tasks/counts?tz=${encodeURIComponent(timeZone)}`),
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => apiFetch<Task>(`/tasks/${id}`),
  });
}

// After any task change: refetch task views, counts, and the lists (whose
// sidebar counts may have changed).
function refreshAfterTaskChange(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: taskKeys.all }),
    queryClient.invalidateQueries({ queryKey: ['lists'] }),
  ]);
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: NewTask) =>
      apiFetch<Task>('/tasks', { method: 'POST', body }),
    onSettled: () => refreshAfterTaskChange(queryClient),
  });
}

// Applies a change to one task, or to one of its subtasks, in cached data.
function applyChanges(task: Task, id: string, changes: TaskChanges): Task {
  const { completed, ...fields } = changes;
  const completedAt =
    completed === undefined
      ? undefined
      : completed
        ? new Date().toISOString()
        : null;
  const patch = completedAt === undefined ? fields : { ...fields, completedAt };

  if (task.id === id) {
    return { ...task, ...patch };
  }
  if (task.subtasks.some((s) => s.id === id)) {
    return {
      ...task,
      subtasks: task.subtasks.map((s) =>
        s.id === id ? { ...s, ...patch } : s,
      ),
    };
  }
  return task;
}

// Optimistic update: the change shows on screen immediately (e.g. a checkbox
// ticks without waiting for the server). If the request fails, every cached
// task query is put back exactly as it was, and the global error toast (see
// main.tsx) tells the user.
export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: TaskChanges }) =>
      apiFetch<Task>(`/tasks/${id}`, { method: 'PATCH', body: changes }),

    onMutate: async ({ id, changes }) => {
      // Stop in-flight refetches from overwriting the optimistic change.
      await queryClient.cancelQueries({ queryKey: taskKeys.all });
      const snapshot = queryClient.getQueriesData({ queryKey: taskKeys.all });

      queryClient.setQueriesData<Task[]>(
        { queryKey: taskKeys.lists },
        (tasks) => tasks?.map((task) => applyChanges(task, id, changes)),
      );
      queryClient.setQueriesData<Task>(
        { queryKey: ['tasks', 'detail'] },
        (task) => task && applyChanges(task, id, changes),
      );
      return { snapshot };
    },

    onError: (_error, _variables, context) => {
      context?.snapshot.forEach(([key, data]) =>
        queryClient.setQueryData(key, data),
      );
    },

    onSettled: () => refreshAfterTaskChange(queryClient),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/tasks/${id}`, { method: 'DELETE' }),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: taskKeys.detail(id) });
    },
    onSettled: () => refreshAfterTaskChange(queryClient),
  });
}
