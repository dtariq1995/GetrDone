import { Transform } from 'class-transformer';

// Trims and lowercases the username before validation, so "Alice " and
// "alice" are the same account on both register and login.
export function NormalizeUsername(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
}
