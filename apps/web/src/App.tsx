import { useEffect, useState } from 'react';

type ApiStatus = 'checking' | 'up' | 'down';

// Placeholder screen for the scaffold milestone. It proves the dev proxy and
// the API are wired together; the real app layout replaces it later.
function App() {
  const [status, setStatus] = useState<ApiStatus>('checking');

  useEffect(() => {
    fetch('/api/health')
      .then((res) => setStatus(res.ok ? 'up' : 'down'))
      .catch(() => setStatus('down'));
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 bg-slate-50 text-slate-800">
      <h1 className="text-3xl font-semibold">GetrDone</h1>
      <p className="text-sm text-slate-500">API: {status}</p>
    </main>
  );
}

export default App;
