import type { Credentials } from '../../api/auth';

export type FieldErrors = Partial<Record<keyof Credentials, string>>;

// Mirrors the API's RegisterDto so most mistakes are caught before a request
// is sent. The API still validates everything; this is only for fast feedback.
export function validateRegister({
  username,
  password,
}: Credentials): FieldErrors {
  const errors: FieldErrors = {};
  const name = username.trim();

  if (name.length < 3 || name.length > 30) {
    errors.username = 'Username must be 3 to 30 characters.';
  } else if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    errors.username =
      'Username can only contain letters, numbers and underscores.';
  }

  if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  } else if (password.length > 128) {
    errors.password = 'Password must be at most 128 characters.';
  }

  return errors;
}

// Logging in only needs both fields filled; the server decides if they match.
export function validateLogin({
  username,
  password,
}: Credentials): FieldErrors {
  const errors: FieldErrors = {};
  if (!username.trim()) {
    errors.username = 'Enter your username.';
  }
  if (!password) {
    errors.password = 'Enter your password.';
  }
  return errors;
}
