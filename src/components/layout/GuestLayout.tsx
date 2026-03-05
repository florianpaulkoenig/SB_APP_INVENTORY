import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { Topbar } from './Topbar';

// ---------------------------------------------------------------------------
// Guest nav items (gallery / collector limited views)
// ---------------------------------------------------------------------------
interface GuestNavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
}

const guestNavItems: GuestNavItem[] = [
  {
    label: 'Dashboard',
    to: '/',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1h-3.5v-4.5a1 1 0 00-1-1h-3a1 1 0 00-1 1V18H4a1 1 0 01-1-1V9.5z" />
      </svg>
    ),
  },
  {
    label: 'Artworks',
    to: '/artworks',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 3.5h5v5h-5zM11.5 3.5h5v5h-5zM3.5 11.5h5v5h-5zM11.5 11.5h5v5h-5z" />
      </svg>
    ),
  },
  {
    label: 'Certificates',
    to: '/certificates',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 1.5l2 2.5h3a1 1 0 011 1v4.5l2 2.5-2 2.5V19l-3-1.5L10 19l-3 1.5L4 19v-4.5L2 12l2-2.5V5a1 1 0 011-1h3l2-2.5z" />
      </svg>
    ),
  },
  {
    label: 'Deliveries',
    to: '/deliveries',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2 4h10v8H2zM12 7h3.5l2.5 3v4h-4M2 14h0M6.5 14a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM14.5 14a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
      </svg>
    ),
  },
];

// ---------------------------------------------------------------------------
// GuestLayout
// ---------------------------------------------------------------------------
export function GuestLayout() {
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Simplified sidebar -- desktop only */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-primary-100 bg-white lg:flex">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-primary-100 px-6">
          <div>
            <span className="font-display text-xl font-bold text-primary-900">NOA</span>
            <p className="text-[10px] font-medium tracking-widest text-primary-400">INVENTORY</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-0.5 px-2">
            {guestNavItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
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
        </nav>

        {/* User + sign out */}
        <div className="border-t border-primary-100 p-4">
          {user && (
            <div className="mb-3">
              <p className="truncate text-xs font-medium text-primary-700">{user.email}</p>
              <p className="text-[10px] uppercase tracking-wider text-primary-400">Guest</p>
            </div>
          )}
          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-primary-500 transition-colors hover:bg-primary-50 hover:text-primary-900"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 3h3a1 1 0 011 1v12a1 1 0 01-1 1h-3M9 15l-4-5 4-5M5 10h9" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile nav overlay (simplified) */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl lg:hidden">
            <div className="flex h-16 items-center justify-between border-b border-primary-100 px-6">
              <div>
                <span className="font-display text-xl font-bold text-primary-900">NOA</span>
                <p className="text-[10px] font-medium tracking-widest text-primary-400">INVENTORY</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md p-2 text-primary-400 transition-colors hover:bg-primary-50 hover:text-primary-700"
                aria-label="Close menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5l10 10M15 5L5 15" />
                </svg>
              </button>
            </div>
            <nav className="py-4">
              <ul className="space-y-0.5 px-3">
                {guestNavItems.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === '/'}
                      onClick={() => setMobileMenuOpen(false)}
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
            </nav>
            {user && (
              <div className="border-t border-primary-100 p-4">
                <p className="truncate text-xs font-medium text-primary-700">{user.email}</p>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  className="mt-3 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-primary-500 transition-colors hover:bg-primary-50 hover:text-primary-900"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onMenuToggle={() => setMobileMenuOpen((prev) => !prev)} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
