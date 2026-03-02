import { BedDouble, CalendarDays, ChartPie, ListChecks, ListTodo, ShieldCheck, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import type { AccessLevel, AppPageKey } from '../types';

type View = 'guests' | 'analytics' | 'timeline' | 'imports' | 'todos' | 'users' | 'stays';

const navItems: Array<{ id: View; page: AppPageKey; label: string; icon: LucideIcon }> = [
  { id: 'guests', page: 'guests', label: 'Guests', icon: Users },
  { id: 'analytics', page: 'analytics', label: 'Analytics', icon: ChartPie },
  { id: 'timeline', page: 'timeline', label: 'Events', icon: CalendarDays },
  { id: 'stays', page: 'stays', label: 'Stays', icon: BedDouble },
  { id: 'todos', page: 'todos', label: 'To Do', icon: ListTodo },
  { id: 'imports', page: 'imports', label: 'Imports', icon: ListChecks },
  { id: 'users', page: 'users', label: 'Users', icon: ShieldCheck }
];

interface SidebarProps {
  activeView: View;
  onChange: (view: View) => void;
  permissions: Record<AppPageKey, AccessLevel>;
}

export function Sidebar({ activeView, onChange, permissions }: SidebarProps) {
  const visibleNavItems = navItems.filter((item) => permissions[item.page] !== 'none');

  return (
    <aside className="card p-3 md:p-5">
      <h1 className="mb-3 text-base font-semibold text-zinc-900 md:mb-6 md:text-lg">Wedding Planner</h1>
      <nav className="flex gap-2 overflow-x-auto pb-1 md:block md:space-y-2 md:overflow-visible md:pb-0">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`relative flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition md:w-full md:gap-3 ${
                isActive ? 'text-zinc-950' : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="active-nav"
                  className="absolute inset-0 rounded-xl bg-emerald-100"
                  transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-3">
                <Icon size={16} />
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
