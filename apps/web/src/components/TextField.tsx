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
      <label htmlFor={id} className="text-sm font-medium text-ink-soft">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`rounded-lg border bg-surface px-3 py-2 text-ink outline-none transition focus:ring-2 ${
          error
            ? 'border-danger focus:ring-danger-subtle'
            : 'border-line-strong focus:border-accent-line focus:ring-accent-muted'
        }`}
        {...inputProps}
      />
      {error && (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
