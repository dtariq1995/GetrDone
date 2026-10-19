import { CircleCheckBig, LogOut } from 'lucide-react';
import { useLogout, useMe } from '../../api/auth';
import { FullPageMessage } from '../../components/FullPageMessage';

// Placeholder for the logged-in app. Milestone 3 replaces it with the sidebar
// and task views.
export function HomePage() {
  const { data: user } = useMe();
  const logout = useLogout();

  return (
    <FullPageMessage>
      <CircleCheckBig className="size-10 text-indigo-600" aria-hidden />
      <h1 className="text-2xl font-semibold text-slate-900">
        Hi, {user?.username}
      </h1>
      <p>Your tasks will live here.</p>
      <button
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        className="mt-2 flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
      >
        <LogOut className="size-4" aria-hidden />
        Log out
      </button>
      {logout.isError && (
        <p role="alert" className="text-sm text-red-600">
          {logout.error.message}
        </p>
      )}
    </FullPageMessage>
  );
}
