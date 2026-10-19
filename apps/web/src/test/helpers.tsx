import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import type { Task } from '../api/tasks';

// Renders a component with the same providers the app uses, but a fresh
// query cache (so tests don't share data) and an in-memory router.
export function renderWithProviders(ui: ReactNode, { route = '/' } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

// Replaces fetch with a fake API. Each request is answered with the value
// for the first path its URL starts with, or a 404.
export function mockApi(routes: Record<string, unknown>) {
  const fetchMock = vi.fn(async (url: string) => {
    const match = Object.keys(routes).find((path) => url.startsWith(path));
    if (match === undefined) {
      return Response.json(
        { statusCode: 404, message: 'Not found' },
        { status: 404 },
      );
    }
    return Response.json(routes[match]);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    listId: null,
    sectionId: null,
    parentId: null,
    title: 'Buy milk',
    notes: '',
    dueAt: null,
    isAllDay: false,
    priority: 0,
    completedAt: null,
    position: 0,
    createdAt: '2026-10-01T12:00:00.000Z',
    updatedAt: '2026-10-01T12:00:00.000Z',
    subtasks: [],
    ...overrides,
  };
}
