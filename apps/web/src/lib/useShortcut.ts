import { useEffect } from 'react';

// Calls `handler` when `key` is pressed, e.g. useShortcut('n', focusQuickAdd).
// Ignored while the user is typing in a field, holding Ctrl/Cmd/Alt (so
// browser shortcuts keep working), or has a dialog open.
export function useShortcut(key: string, handler: () => void) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== key || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.closest('input, textarea, select') !== null);
      if (typing || document.querySelector('dialog[open]')) {
        return;
      }
      event.preventDefault(); // e.g. stop "/" opening the browser's find bar
      handler();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [key, handler]);
}
