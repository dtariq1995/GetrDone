import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router';
import { CircleCheckBig, LoaderCircle } from 'lucide-react';
import { useLogin, useRegister, type Credentials } from '../../api/auth';
import { TextField } from '../../components/TextField';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import {
  validateLogin,
  validateRegister,
  type FieldErrors,
} from './validation';

type Mode = 'login' | 'register';

const copy = {
  login: {
    title: 'Welcome back',
    submit: 'Log in',
    switchText: "Don't have an account?",
    switchLink: 'Sign up',
    switchTo: '/register',
  },
  register: {
    title: 'Create your account',
    submit: 'Sign up',
    switchText: 'Already have an account?',
    switchLink: 'Log in',
    switchTo: '/login',
  },
} as const;

// Shared by the login and register pages, which differ only in wording,
// validation rules and which API call they make.
export function AuthForm({ mode }: { mode: Mode }) {
  const [values, setValues] = useState<Credentials>({
    username: '',
    password: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const location = useLocation();

  const login = useLogin();
  const register = useRegister();
  const mutation = mode === 'login' ? login : register;
  const text = copy[mode];
  useDocumentTitle(text.submit);

  function updateField(field: keyof Credentials, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Clear that field's error as soon as the user edits it.
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors =
      mode === 'login' ? validateLogin(values) : validateRegister(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    // On success the `me` query is updated and GuestRoute redirects into the
    // app, so there's nothing to do here afterwards.
    mutation.mutate(values);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-muted px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2 text-accent-ink">
          <CircleCheckBig className="size-8" aria-hidden />
          <span className="text-2xl font-semibold text-ink">GetrDone</span>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-8 shadow-sm"
        >
          <h1 className="text-xl font-semibold text-ink">{text.title}</h1>

          {mutation.isError && (
            <p
              role="alert"
              className="rounded-lg bg-danger-subtle px-3 py-2 text-sm text-danger"
            >
              {mutation.error.message}
            </p>
          )}

          <TextField
            label="Username"
            name="username"
            autoComplete="username"
            autoFocus
            value={values.username}
            onChange={(e) => updateField('username', e.target.value)}
            error={fieldErrors.username}
          />
          <TextField
            label="Password"
            name="password"
            type="password"
            autoComplete={
              mode === 'login' ? 'current-password' : 'new-password'
            }
            value={values.password}
            onChange={(e) => updateField('password', e.target.value)}
            error={fieldErrors.password}
          />

          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 font-medium text-white transition hover:bg-accent-strong disabled:opacity-60"
          >
            {mutation.isPending && (
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
            )}
            {text.submit}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-soft">
          {text.switchText}{' '}
          {/* Pass the location state along so a redirect target survives
              switching between login and sign-up. */}
          <Link
            to={text.switchTo}
            state={location.state}
            className="font-medium text-accent-ink hover:underline"
          >
            {text.switchLink}
          </Link>
        </p>
      </div>
    </main>
  );
}
