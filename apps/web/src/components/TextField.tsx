import { useId, type InputHTMLAttributes } from 'react';

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

// A labelled input with an optional error message underneath. The error is
// linked with aria-describedby so screen readers announce it with the field.
export function TextField({ label, error, ...inputProps }: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none transition focus:ring-2 ${
          error
            ? 'border-red-400 focus:ring-red-200'
            : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'
        }`}
        {...inputProps}
      />
      {error && (
        <p id={errorId} className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
