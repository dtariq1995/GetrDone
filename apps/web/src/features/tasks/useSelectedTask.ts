import { useSearchParams } from 'react-router';

// The open task lives in the URL (?task=<id>), so the detail panel survives a
// refresh and can be linked to, and the browser's Back button closes it.
export function useSelectedTask() {
  const [searchParams, setSearchParams] = useSearchParams();

  function setTask(id: string | null) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id) next.set('task', id);
      else next.delete('task');
      return next;
    });
  }

  return {
    selectedId: searchParams.get('task'),
    open: (id: string) => setTask(id),
    close: () => setTask(null),
  };
}
