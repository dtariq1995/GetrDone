import { useState, type FormEvent } from 'react';
import { Check } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import {
  useCreateList,
  useDeleteList,
  useUpdateList,
  type ListWithCount,
} from '../../api/lists';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Modal } from '../../components/Modal';
import { TextField } from '../../components/TextField';

const COLORS = [
  '#6366f1',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#8b5cf6',
  '#64748b',
];

type ListDialogProps = {
  // Editing an existing list, or creating one when left out.
  list?: ListWithCount;
  onClose: () => void;
};

export function ListDialog({ list, onClose }: ListDialogProps) {
  const [name, setName] = useState(list?.name ?? '');
  const [color, setColor] = useState(list?.color ?? COLORS[0]);
  const [nameError, setNameError] = useState<string>();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const createList = useCreateList();
  const updateList = useUpdateList();
  const deleteList = useDeleteList();
  const saving = createList.isPending || updateList.isPending;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Give the list a name.');
      return;
    }

    if (list) {
      updateList.mutate(
        { id: list.id, name: trimmed, color },
        { onSuccess: onClose },
      );
    } else {
      createList.mutate(
        { name: trimmed, color },
        {
          onSuccess: (created) => {
            onClose();
            navigate(`/lists/${created.id}`);
          },
        },
      );
    }
  }

  function handleDelete() {
    if (!list) return;
    deleteList.mutate(list.id, {
      onSuccess: () => {
        onClose();
        // Don't leave the user looking at a list that no longer exists.
        if (location.pathname === `/lists/${list.id}`) {
          navigate('/inbox');
        }
      },
    });
  }

  if (list && confirmingDelete) {
    return (
      <ConfirmDialog
        title="Delete list?"
        message={
          list.taskCount > 0
            ? `“${list.name}” and all of its tasks will be deleted.`
            : `“${list.name}” will be deleted.`
        }
        confirmLabel="Delete list"
        pending={deleteList.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    );
  }

  return (
    <Modal title={list ? 'Edit list' : 'New list'} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <TextField
          label="Name"
          autoFocus
          maxLength={100}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setNameError(undefined);
          }}
          error={nameError}
        />

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700">
            Colour
          </legend>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Colour ${c}`}
                aria-pressed={color === c}
                className="flex size-8 items-center justify-center rounded-full ring-offset-2 transition hover:scale-110 aria-pressed:ring-2 aria-pressed:ring-slate-400"
                style={{ backgroundColor: c }}
              >
                {color === c && (
                  <Check
                    className="size-4 text-white"
                    strokeWidth={3}
                    aria-hidden
                  />
                )}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="flex items-center justify-between gap-2 pt-2">
          {list ? (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Delete list
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {list ? 'Save' : 'Create list'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
