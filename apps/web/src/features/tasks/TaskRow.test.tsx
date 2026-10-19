import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { makeTask, mockApi, renderWithProviders } from '../../test/helpers';
import { TaskRow } from './TaskRow';

describe('TaskRow', () => {
  it('shows the title, subtask progress and an overdue date', () => {
    const task = makeTask({
      dueAt: '2020-01-01T12:00:00.000Z',
      isAllDay: true,
      subtasks: [
        {
          id: 's1',
          title: 'One',
          completedAt: '2026-01-01T00:00:00Z',
          position: 1,
        },
        { id: 's2', title: 'Two', completedAt: null, position: 2 },
      ],
    });
    renderWithProviders(
      <TaskRow task={task} selected={false} onOpen={() => {}} />,
    );

    expect(screen.getByText('Buy milk')).toBeInTheDocument();
    expect(screen.getByLabelText('1 of 2 subtasks done')).toBeInTheDocument();
    expect(screen.getByText('(overdue)')).toBeInTheDocument();
  });

  it('completes the task when the checkbox is clicked, without opening it', async () => {
    const task = makeTask();
    const fetchMock = mockApi({ '/api/tasks/task-1': task });
    const onOpen = vi.fn();
    renderWithProviders(
      <TaskRow task={task} selected={false} onOpen={onOpen} />,
    );

    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Mark “Buy milk” as done' }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/tasks/task-1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ completed: true }),
      }),
    );
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('opens the task when the title is clicked', async () => {
    const onOpen = vi.fn();
    renderWithProviders(
      <TaskRow task={makeTask()} selected={false} onOpen={onOpen} />,
    );
    await userEvent.click(screen.getByText('Buy milk'));
    expect(onOpen).toHaveBeenCalledOnce();
  });
});
