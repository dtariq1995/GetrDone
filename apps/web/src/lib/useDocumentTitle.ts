import { useEffect } from 'react';

// Sets the browser tab title, e.g. "Today · GetrDone".
export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    document.title = title ? `${title} · GetrDone` : 'GetrDone';
  }, [title]);
}
