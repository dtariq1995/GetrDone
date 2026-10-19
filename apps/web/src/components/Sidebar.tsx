import { useState } from 'react';
import { NavLink } from 'react-router';
import { CircleCheckBig, LogOut, MoreHorizontal, Plus } from 'lucide-react';
import { useLogout, useMe } from '../api/auth';
import { useLists, type ListWithCount } from '../api/lists';
import { useTaskCounts } from '../api/tasks';
import { ListDialog } from '../features/lists/ListDialog';
import { SMART_VIEWS } from '../features/tasks/views';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
    isActive
      ? 'bg-indigo-100 font-medium text-indigo-700'
      : 'text-slate-700 hover:bg-slate-200/60'
  }`;

function Count({ value }: { value?: number }) {
  return value ? (
    <span className="ml-auto text-xs text-slate-400">{value}</span>
  ) : null;
}

export function Sidebar() {
  const me = useMe();
  const logout = useLogout();
  const counts = useTaskCounts();
  const lists = useLists();
  // null = closed; { list: undefined } = creating; { list } = editing.
  const [dialog, setDialog] = useState<{ list?: ListWithCount } | null>(null);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
      <div className="flex items-center gap-2 px-5 py-5 text-indigo-600">
        <CircleCheckBig className="size-6" aria-hidden />
        <span className="text-lg font-semibold text-slate-900">GetrDone</span>
      </div>

      <nav aria-label="Views and lists" className="flex-1 overflow-y-auto px-3">
        <ul className="flex flex-col gap-0.5">
          {SMART_VIEWS.map(({ view, path, title, icon: Icon, countKey }) => (
            <li key={view}>
              <NavLink to={path} className={linkClass}>
                <Icon className="size-4 shrink-0" aria-hidden />
                {title}
                <Count value={countKey && counts.data?.[countKey]} />
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="mt-6 mb-1 flex items-center justify-between px-3">
          <h2 className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            Lists
          </h2>
          <button
            type="button"
            onClick={() => setDialog({})}
            aria-label="New list"
            className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
          >
            <Plus className="size-4" aria-hidden />
          </button>
        </div>

        {/* As in TaskListView: a failed refetch keeps the lists we have. */}
        {lists.isPending ? (
          <div className="flex flex-col gap-2 px-3 py-1" aria-busy="true">
            <div className="h-5 animate-pulse rounded bg-slate-200" />
            <div className="h-5 animate-pulse rounded bg-slate-200" />
          </div>
        ) : !lists.data ? (
          <p className="px-3 py-1 text-sm text-slate-500">
            Couldn’t load lists.
          </p>
        ) : lists.data.length === 0 ? (
          <button
            type="button"
            onClick={() => setDialog({})}
            className="px-3 py-1 text-sm text-slate-500 hover:text-indigo-600"
          >
            Create your first list
          </button>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {lists.data.map((list) => (
              // The edit button sits beside the link, not inside it: a button
              // nested in a link is invalid HTML and confuses screen readers.
              <li key={list.id} className="group relative">
                <NavLink to={`/lists/${list.id}`} className={linkClass}>
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: list.color }}
                    aria-hidden
                  />
                  <span className="truncate pr-6">{list.name}</span>
                  <span className="group-hover:invisible">
                    <Count value={list.taskCount} />
                  </span>
                </NavLink>
                <button
                  type="button"
                  onClick={() => setDialog({ list })}
                  aria-label={`Edit list “${list.name}”`}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-200 hover:text-slate-700 focus:opacity-100"
                >
                  <MoreHorizontal className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>

      <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
        <span className="truncate text-sm text-slate-600">
          {me.data?.username}
        </span>
        <button
          type="button"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          aria-label="Log out"
          title="Log out"
          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
        >
          <LogOut className="size-4" aria-hidden />
        </button>
      </div>

      {dialog && (
        <ListDialog list={dialog.list} onClose={() => setDialog(null)} />
      )}
    </aside>
  );
}
