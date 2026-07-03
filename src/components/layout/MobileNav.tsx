import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { usePortfolio, type Portfolio } from '../../contexts/PortfolioContext';
import type { UserRole } from '../../types/database';
import {
  bottomItems,
  filterByRole,
  getNavSections,
  PORTFOLIO_LABELS,
} from './navConfig';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const { user, signOut, role: authRole } = useAuth();
  const role: UserRole = authRole ?? 'admin';
  const { portfolio, setPortfolio } = usePortfolio();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 lg:hidden',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in panel */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white shadow-xl transition-transform duration-300 ease-in-out lg:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Header */}
        <div className="relative flex h-16 items-center justify-between border-b border-primary-100 px-6">
          <button
            onClick={() => setSwitcherOpen((o) => !o)}
            className="flex items-center gap-2 text-left"
          >
            <div>
              <span className="font-display text-base font-bold text-primary-900">NOA contemporary</span>
              <p className="text-[10px] font-medium tracking-widest text-primary-400">
                {PORTFOLIO_LABELS[portfolio].name.toUpperCase()}
              </p>
            </div>
            <svg className="h-3 w-3 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-primary-400 transition-colors hover:bg-primary-50 hover:text-primary-700"
            aria-label="Close menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>

          {/* Dropdown */}
          {switcherOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setSwitcherOpen(false)} />
              <div className="absolute left-4 right-4 top-14 z-50 rounded-md border border-primary-100 bg-white shadow-lg">
                {(['simon_berger', 'noa_collection', 'noa_curation', 'noa_liquidity'] as Portfolio[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => { setPortfolio(p); setSwitcherOpen(false); }}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-primary-50',
                      p === portfolio ? 'text-primary-900' : 'text-primary-500',
                    )}
                  >
                    <span className={cn(
                      'h-2 w-2 rounded-full',
                      p === portfolio ? 'bg-accent' : 'bg-primary-200',
                    )} />
                    <p className="text-xs font-semibold">{PORTFOLIO_LABELS[p].name}</p>
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
                <p className="mb-1 px-6 text-[10px] font-semibold uppercase tracking-wider text-primary-400">
                  {section.title}
                </p>
                <ul className="space-y-0.5 px-3">
                  {visibleItems.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.to === '/'}
                        onClick={onClose}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                            isActive
                              ? 'border-l-2 border-l-accent bg-primary-100 text-primary-900'
                              : 'border-l-2 border-l-transparent text-primary-500 hover:bg-primary-50 hover:text-primary-900',
                          )
                        }
                      >
                        <span className="shrink-0">{item.icon}</span>
                        <span>{item.label}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {/* Bottom items */}
          <div className="border-t border-primary-100 pt-4">
            <ul className="space-y-0.5 px-3">
              {filterByRole(bottomItems, role).map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'border-l-2 border-l-accent bg-primary-100 text-primary-900'
                          : 'border-l-2 border-l-transparent text-primary-500 hover:bg-primary-50 hover:text-primary-900',
                      )
                    }
                  >
                    <span className="shrink-0">{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* User info + Sign out */}
        <div className="border-t border-primary-100 p-4">
          {user && (
            <div className="mb-3">
              <p className="truncate text-xs font-medium text-primary-700">{user.email}</p>
              <p className="text-[10px] uppercase tracking-wider text-primary-400">{role}</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              onClose();
              signOut();
            }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-primary-500 transition-colors hover:bg-primary-50 hover:text-primary-900"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 3h3a1 1 0 011 1v12a1 1 0 01-1 1h-3M9 15l-4-5 4-5M5 10h9" />
            </svg>
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
}

