import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type ThemePreference } from '../lib/theme';

const ORDER: ThemePreference[] = ['system', 'light', 'dark'];
const ICONS = { system: Monitor, light: Sun, dark: Moon };
const LABELS = { system: 'System', light: 'Light', dark: 'Dark' };

// One button that cycles System → Light → Dark.
export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  const next = ORDER[(ORDER.indexOf(preference) + 1) % ORDER.length];
  const Icon = ICONS[preference];
  const label = `Theme: ${LABELS[preference]} (switch to ${LABELS[next]})`;

  return (
    <button
      type="button"
      onClick={() => setPreference(next)}
      aria-label={label}
      title={label}
      className="rounded-md p-1.5 text-ink-faint hover:bg-surface-strong hover:text-ink-soft"
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );
}
