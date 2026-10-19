import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/helpers';
import { AuthForm } from './AuthForm';

describe('AuthForm', () => {
  it('shows field errors and sends nothing when sign-up input is invalid', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderWithProviders(<AuthForm mode="register" />);

    await userEvent.type(screen.getByLabelText('Username'), 'a b');
    await userEvent.type(screen.getByLabelText('Password'), 'short');
    await userEvent.click(screen.getByRole('button', { name: 'Sign up' }));

    expect(
      screen.getByText(/can only contain letters, numbers and underscores/),
    ).toBeInTheDocument();
    expect(screen.getByText(/at least 8 characters/)).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows the server’s message when login fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json(
          { statusCode: 401, message: 'Invalid username or password' },
          { status: 401 },
        ),
      ),
    );
    renderWithProviders(<AuthForm mode="login" />);

    await userEvent.type(screen.getByLabelText('Username'), 'alice');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid username or password',
    );
  });
});
