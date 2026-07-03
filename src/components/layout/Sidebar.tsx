import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { usePortfolio, type Portfolio } from '../../contexts/PortfolioContext';
import type { UserRole } from '../../types/database';
import {
  icons,
  bottomItems,
  filterByRole,
  getNavSections,
  PORTFOLIO_LABELS,
} from './navConfig';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}
export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, signOut, role: authRole } = useAuth();
  const role: UserRole = authRole ?? 'admin';
  const { portfolio, setPortfolio } = usePortfolio();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 flex flex-col border-r border-primary-100 bg-white transition-all duration-300',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Portfolio switcher */}
      <div className={cn(
        'relative flex h-16 shrink-0 items-center border-b border-primary-100',
        collapsed ? 'justify-center px-2' : 'px-6',
      )}>
        {collapsed ? (
          <span className="font-display text-lg font-bold text-primary-900">N</span>
        ) : (
          <button
            onClick={() => setSwitcherOpen((o) => !o)}
            className="flex w-full items-center justify-between text-left"
          >
            <div>
              <span className="font-display text-base font-bold text-primary-900">
                NOA contemporary
              </span>
              <p className="text-[10px] font-medium tracking-widest text-accent">
                {PORTFOLIO_LABELS[portfolio].sub}
              </p>
            </div>
            <svg className="h-3 w-3 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}

        {/* Dropdown */}
        {switcherOpen && !collapsed && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setSwitcherOpen(false)} />
            <div className="absolute left-4 right-4 top-14 z-50 rounded-md border border-primary-100 bg-white shadow-lg">
              {(['simon_berger', 'noa_collection', 'noa_curation', 'noa_liquidity'] as Portfolio[]).map((p) => (
                <button
                  key={p}
                  onClick={() => { setPortfolio(p); setSwitcherOpen(false); }}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-primary-50',
                    p === portfolio ? 'text-primary-900' : 'text-primary-500',
                  )}
                >
                  <span className={cn(
                    'h-2 w-2 rounded-full',
                    p === portfolio ? 'bg-accent' : 'bg-primary-200',
                  )} />
                  <div>
                    <p className="text-xs font-semibold">{PORTFOLIO_LABELS[p].name}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {getNavSections(portfolio).map((section) => {
          const visibleItems = filterByRole(section.items, role);
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className="mb-4">
              {!collapsed && (
                <p className="mb-1 px-6 text-[9px] font-light uppercase tracking-[0.2em] text-primary-300">
                  {section.title}
                </p>
              )}
              <ul className="space-y-0 px-2">
                {visibleItems.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === '/'}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-none px-3 py-2 text-xs transition-colors',
                          collapsed && 'justify-center px-2',
                          isActive
                            ? 'border-l border-l-accent text-primary-900'
                            : 'border-l border-l-transparent text-primary-400 hover:text-primary-900',
                        )
                      }
                      title={collapsed ? item.label : undefined}
                    >
                      <span className="shrink-0">{item.icon}</span>
                      {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="shrink-0 border-t border-primary-100 py-3">
        {/* Bottom nav items */}
        <ul className="space-y-0.5 px-2">
          {filterByRole(bottomItems, role).map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-none px-3 py-2 text-xs transition-colors',
                    collapsed && 'justify-center px-2',
                    isActive
                      ? 'border-l border-l-accent text-primary-900'
                      : 'border-l border-l-transparent text-primary-400 hover:text-primary-900',
                  )
                }
                title={collapsed ? item.label : undefined}
              >
                <span className="shrink-0">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* User info */}
        {!collapsed && user && (
          <div className="mt-3 border-t border-primary-100 px-4 pt-3">
            <p className="truncate text-xs font-medium text-primary-700">{user.email}</p>
            <p className="text-[10px] uppercase tracking-wider text-primary-400">{role}</p>
          </div>
        )}

        {/* Logout + Collapse toggle */}
        <div className={cn(
          'mt-2 flex items-center gap-1 px-2',
          collapsed ? 'flex-col' : '',
        )}>
          <button
            type="button"
            onClick={signOut}
            className={cn(
              'flex items-center gap-2 rounded-none px-3 py-2 text-xs text-primary-400 transition-colors hover:text-primary-900',
              collapsed && 'justify-center px-2',
            )}
            title="Sign out"
          >
            <span className="shrink-0">{icons.logout}</span>
            {!collapsed && <span>Sign Out</span>}
          </button>

          <button
            type="button"
            onClick={onToggle}
            className="ml-auto flex items-center justify-center rounded-md p-2 text-primary-400 transition-colors hover:bg-primary-50 hover:text-primary-700"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? icons.expand : icons.collapse}
          </button>
        </div>
      </div>
    </aside>
  );
}

