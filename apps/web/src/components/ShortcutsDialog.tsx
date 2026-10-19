import { Modal } from './Modal';

const SHORTCUTS: [keys: string[], action: string][] = [
  [['n'], 'New task (in a list view or the calendar)'],
  [['/'], 'Search tasks'],
  [['Esc'], 'Close the task panel or a dialog'],
  [['Space', '←↑→↓', 'Space'], 'Drag with the keyboard: pick up, move, drop'],
  [['?'], 'Show this list'],
];

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Keyboard shortcuts" onClose={onClose}>
      <dl className="flex flex-col gap-3 text-sm">
        {SHORTCUTS.map(([keys, action]) => (
          <div key={action} className="flex items-center justify-between gap-4">
            <dt className="text-ink-soft">{action}</dt>
            <dd className="flex shrink-0 gap-1">
              {keys.map((k, i) => (
                <kbd
                  key={i}
                  className="rounded border border-line bg-surface-sunken px-1.5 py-0.5 font-mono text-xs text-ink"
                >
                  {k}
                </kbd>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
