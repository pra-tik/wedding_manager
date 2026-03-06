import { BedDouble, CalendarDays, ChartPie, ListChecks, ListTodo, ShieldCheck, Users, X } from 'lucide-react';
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
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ activeView, onChange, permissions, mobileOpen, onCloseMobile }: SidebarProps) {
  const visibleNavItems = navItems.filter((item) => permissions[item.page] !== 'none');

  return (
    <>
      <aside className="card sticky top-6 hidden p-3 md:block md:p-5">
        <div className="mb-4 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">Planner Suite</p>
          <h1 className="mt-1 text-lg font-semibold text-slate-900">Wedding Ops</h1>
        </div>
        <nav className="flex gap-2 overflow-x-auto pb-1 md:block md:space-y-2 md:overflow-visible md:pb-0">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onChange(item.id)}
                className={`relative flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition md:w-full md:gap-3 ${
                  isActive ? 'text-slate-950' : 'text-slate-600 hover:bg-slate-100/70'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="active-nav"
                    className="absolute inset-0 rounded-xl border border-emerald-200 bg-emerald-100/80"
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

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button className="absolute inset-0 bg-slate-900/35 backdrop-blur-[2px]" onClick={onCloseMobile} aria-label="Close navigation" />
          <aside className="absolute left-0 top-0 h-full w-72 max-w-[85vw] border-r border-white/60 bg-white/95 p-4 shadow-2xl backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Menu</h2>
              <button className="btn-muted px-2 py-1" onClick={onCloseMobile} aria-label="Close menu">
                <X size={16} />
              </button>
            </div>
            <nav className="space-y-2">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onChange(item.id);
                      onCloseMobile();
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm ${
                      isActive ? 'bg-emerald-100 text-slate-900' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
