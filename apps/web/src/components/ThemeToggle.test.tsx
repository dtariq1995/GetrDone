import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeToggle } from './ThemeToggle';

// jsdom has no matchMedia; pretend the OS is in light mode.
function mockSystemTheme(dark: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: dark,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('cycles System → Light → Dark, saving the choice', async () => {
    mockSystemTheme(false);
    render(<ThemeToggle />);
    const button = () => screen.getByRole('button');

    expect(button()).toHaveAccessibleName(/Theme: System/);
    expect(document.documentElement).not.toHaveClass('dark');

    await userEvent.click(button());
    expect(button()).toHaveAccessibleName(/Theme: Light/);
    expect(localStorage.getItem('getrdone-theme')).toBe('light');

    await userEvent.click(button());
    expect(button()).toHaveAccessibleName(/Theme: Dark/);
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('getrdone-theme')).toBe('dark');

    await userEvent.click(button());
    expect(button()).toHaveAccessibleName(/Theme: System/);
    expect(localStorage.getItem('getrdone-theme')).toBeNull();
  });

  it('follows a dark operating system when set to System', () => {
    mockSystemTheme(true);
    render(<ThemeToggle />);
    expect(document.documentElement).toHaveClass('dark');
  });
});
