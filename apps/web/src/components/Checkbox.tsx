import { Check } from 'lucide-react';
import { priorityStyle } from '../lib/priority';

type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  // Colours the ring by priority, like TickTick.
  priority?: number;
  size?: 'sm' | 'md';
};

// The round task checkbox. A button with role="checkbox" so it can be styled
// freely while screen readers still announce it as a checkbox.
export function Checkbox({
  checked,
  onChange,
  label,
  priority = 0,
  size = 'md',
}: CheckboxProps) {
  const ring = checked
    ? 'border-slate-300 bg-slate-300 text-white'
    : `${priorityStyle(priority).border} bg-white hover:bg-slate-100`;

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(event) => {
        // Don't also trigger the row's click (which opens the task).
        event.stopPropagation();
        onChange(!checked);
      }}
      className={`flex shrink-0 items-center justify-center rounded-full border-2 transition ${ring} ${
        size === 'sm' ? 'size-4' : 'size-5'
      }`}
    >
      {checked && <Check className="size-3" strokeWidth={3} aria-hidden />}
    </button>
  );
}
