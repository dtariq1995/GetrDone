import { useEffect, useState } from 'react';

// Light, dark, or follow the operating system. The choice is kept in
// localStorage (a per-browser display preference, not account data).
export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'getrdone-theme';
const darkQuery = '(prefers-color-scheme: dark)';

function readPreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  } catch {
    return 'system'; // storage can be blocked (e.g. some private modes)
  }
}

// Adds or removes the "dark" class on <html>, which switches the colour
// tokens in index.css. index.html runs the same check before React loads,
// so the page never flashes the wrong theme.
function apply(preference: ThemePreference) {
  const dark =
    preference === 'dark' ||
    (preference === 'system' && window.matchMedia(darkQuery).matches);
  document.documentElement.classList.toggle('dark', dark);
}

export function useTheme() {
  const [preference, setPreference] = useState(readPreference);

  useEffect(() => {
    apply(preference);
    try {
      if (preference === 'system') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // Not saved; the theme still applies for this visit.
    }
    if (preference !== 'system') return;
    // Following the OS: react when it switches (e.g. at sunset).
    const media = window.matchMedia(darkQuery);
    const onChange = () => apply('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [preference]);

  return { preference, setPreference };
}
