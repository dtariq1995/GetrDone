import { addDays, format } from 'date-fns';
import { X } from 'lucide-react';
import { fromInputs, toDateInput, toTimeInput } from '../lib/dates';

type DueDate = { dueAt: string | null; isAllDay: boolean };

type DatePickerProps = DueDate & {
  onChange: (value: DueDate) => void;
};

// Due date editor built on the browser's own date and time inputs (which
// handle keyboard entry, locale and accessibility). Leaving the time empty
// makes it an all-day task.
export function DatePicker({ dueAt, isAllDay, onChange }: DatePickerProps) {
  const date = dueAt ? toDateInput(dueAt) : '';
  const time = dueAt ? toTimeInput(dueAt, isAllDay) : '';

  function update(nextDate: string, nextTime: string) {
    onChange(
      nextDate
        ? fromInputs(nextDate, nextTime)
        : { dueAt: null, isAllDay: false },
    );
  }

  const shortcut = (label: string, offset: number) => (
    <button
      type="button"
      onClick={() =>
        update(format(addDays(new Date(), offset), 'yyyy-MM-dd'), time)
      }
      className="rounded-md px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          type="date"
          aria-label="Due date"
          value={date}
          onChange={(e) => update(e.target.value, time)}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-800"
        />
        <input
          type="time"
          aria-label="Due time (leave empty for all day)"
          value={time}
          disabled={!date}
          onChange={(e) => update(date, e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-800 disabled:opacity-50"
        />
        {dueAt && (
          <button
            type="button"
            onClick={() => update('', '')}
            aria-label="Clear due date"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>
      <div className="flex gap-1">
        {shortcut('Today', 0)}
        {shortcut('Tomorrow', 1)}
        {shortcut('Next week', 7)}
      </div>
    </div>
  );
}
