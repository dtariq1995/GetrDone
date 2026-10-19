import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { makeTask, mockApi, renderWithProviders } from '../../test/helpers';
import { TaskListView } from './TaskListView';

describe('TaskListView', () => {
  it('shows the empty state for a view with no tasks', async () => {
    mockApi({ '/api/lists': [], '/api/tasks?': [] });
    renderWithProviders(<TaskListView view="today" />);

    expect(await screen.findByText('Nothing due today')).toBeInTheDocument();
  });

  it('keeps completed tasks in a collapsed group', async () => {
    mockApi({
      '/api/lists': [],
      '/api/tasks?': [
        makeTask({ id: 'a', title: 'Open task' }),
        makeTask({
          id: 'b',
          title: 'Done task',
          completedAt: '2026-10-19T12:00:00.000Z',
        }),
      ],
    });
    renderWithProviders(<TaskListView view="inbox" />);

    expect(await screen.findByText('Open task')).toBeInTheDocument();
    expect(screen.queryByText('Done task')).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: /Completed \(1\)/ }),
    );
    expect(screen.getByText('Done task')).toBeInTheDocument();
  });

  it('shows "List not found" for a list that does not exist', async () => {
    mockApi({ '/api/lists': [], '/api/tasks?': [] });
    renderWithProviders(<TaskListView view="list" listId="missing" />);

    expect(await screen.findByText('List not found')).toBeInTheDocument();
  });
});
