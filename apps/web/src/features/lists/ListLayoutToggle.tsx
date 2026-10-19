import { NavLink } from 'react-router';
import { Columns3, List } from 'lucide-react';

// Switches a list between its task list and its Kanban board. Each layout
// has its own URL, so the choice survives a refresh.
export function ListLayoutToggle({ listId }: { listId: string }) {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium transition ${
      isActive
        ? 'bg-indigo-600 text-white'
        : 'text-slate-600 hover:bg-slate-100'
    }`;

  return (
    <nav
      aria-label="Layout"
      className="flex rounded-lg border border-slate-200 p-0.5"
    >
      {/* end: only exact /lists/:id counts as "List", not /board too. */}
      <NavLink to={`/lists/${listId}`} end className={linkClass}>
        <List className="size-4" aria-hidden />
        List
      </NavLink>
      <NavLink to={`/lists/${listId}/board`} className={linkClass}>
        <Columns3 className="size-4" aria-hidden />
        Board
      </NavLink>
    </nav>
  );
}
