import { useState, type FormEvent } from 'react';
import { format, startOfDay } from 'date-fns';
import { useCreateTask } from '../../api/tasks';
import { Modal } from '../../components/Modal';
import { TextField } from '../../components/TextField';

type AddTaskOnDayDialogProps = {
  day: Date;
  onClose: () => void;
};

// Opened from a day's "+" button: adds an all-day Inbox task due that day.
export function AddTaskOnDayDialog({ day, onClose }: AddTaskOnDayDialogProps) {
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string>();
  const createTask = useCreateTask();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Give the task a title.');
      return;
    }
    createTask.mutate(
      {
        title: trimmed,
        dueAt: startOfDay(day).toISOString(),
        isAllDay: true,
      },
      { onSuccess: onClose },
    );
  }

  return (
    <Modal
      title={`New task on ${format(day, 'EEEE, MMMM d')}`}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <TextField
          label="Title"
          autoFocus
          maxLength={500}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setError(undefined);
          }}
          error={error}
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-ink-soft hover:bg-surface-sunken"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createTask.isPending}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-60"
          >
            Add task
          </button>
        </div>
      </form>
    </Modal>
  );
}
