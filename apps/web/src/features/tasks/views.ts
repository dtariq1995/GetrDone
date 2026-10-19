import {
  CalendarRange,
  CircleCheckBig,
  Inbox,
  Layers,
  Sun,
  type LucideIcon,
} from 'lucide-react';
import type { TaskCounts, TaskView } from '../../api/tasks';

export type SmartView = {
  view: Exclude<TaskView, 'list'>;
  path: string;
  title: string;
  icon: LucideIcon;
  // Which number from GET /tasks/counts to show in the sidebar, if any.
  countKey?: keyof TaskCounts;
  emptyTitle: string;
  emptyMessage: string;
};

// The built-in views. The sidebar and the routes in App.tsx are both built
// from this one list, so they can't drift apart.
export const SMART_VIEWS: SmartView[] = [
  {
    view: 'inbox',
    path: '/inbox',
    title: 'Inbox',
    icon: Inbox,
    countKey: 'inbox',
    emptyTitle: 'Your Inbox is empty',
    emptyMessage: 'Tasks that aren’t in a list land here.',
  },
  {
    view: 'today',
    path: '/today',
    title: 'Today',
    icon: Sun,
    countKey: 'today',
    emptyTitle: 'Nothing due today',
    emptyMessage: 'Add a task above, or enjoy the free time.',
  },
  {
    view: 'next7',
    path: '/next7',
    title: 'Next 7 Days',
    icon: CalendarRange,
    countKey: 'next7',
    emptyTitle: 'Nothing due this week',
    emptyMessage: 'Tasks with a due date in the next 7 days show up here.',
  },
  {
    view: 'all',
    path: '/all',
    title: 'All',
    icon: Layers,
    emptyTitle: 'No tasks yet',
    emptyMessage: 'Add your first task above.',
  },
  {
    view: 'completed',
    path: '/completed',
    title: 'Completed',
    icon: CircleCheckBig,
    emptyTitle: 'Nothing completed yet',
    emptyMessage: 'Finished tasks show up here.',
  },
];
