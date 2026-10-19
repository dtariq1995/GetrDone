import { useEffect, useState } from 'react';

// Returns `value` once it has stopped changing for `delayMs`. Used for the
// search box, so the API is queried when the user pauses typing rather than
// on every keystroke.
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
