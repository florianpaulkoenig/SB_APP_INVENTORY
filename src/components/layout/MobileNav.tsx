import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type UserRole = 'admin' | 'gallery' | 'collector';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Icons (same as Sidebar, 20x20 stroke)
// ---------------------------------------------------------------------------
const icons = {
  dashboard: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1h-3.5v-4.5a1 1 0 00-1-1h-3a1 1 0 00-1 1V18H4a1 1 0 01-1-1V9.5z" />
    </svg>
  ),
  artworks: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 3.5h5v5h-5zM11.5 3.5h5v5h-5zM3.5 11.5h5v5h-5zM11.5 11.5h5v5h-5z" />
    </svg>
  ),
  galleries: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16V6a2 2 0 012-2h10a2 2 0 012 2v10M3 16h14M3 16l2-6h10l2 6M7 8v2M10 8v2M13 8v2" />
    </svg>
  ),
  production: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 3.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM10 7v3l2 1.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 3.5L16 2M5.5 3.5L4 2" />
    </svg>
  ),
  certificate: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 1.5l2 2.5h3a1 1 0 011 1v4.5l2 2.5-2 2.5V19l-3-1.5L10 19l-3 1.5L4 19v-4.5L2 12l2-2.5V5a1 1 0 011-1h3l2-2.5z" />
    </svg>
  ),
  delivery: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 4h10v8H2zM12 7h3.5l2.5 3v4h-4M2 14h0M6.5 14a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM14.5 14a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
    </svg>
  ),
  packingList: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 3h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1zM3 7h14M8 3v4" />
    </svg>
  ),
  catalogue: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 2.5h12a1.5 1.5 0 011.5 1.5v12a1.5 1.5 0 01-1.5 1.5H4A1.5 1.5 0 012.5 16V4A1.5 1.5 0 014 2.5zM6 2.5v15M9.5 6.5h4M9.5 9.5h4M9.5 12.5h2" />
    </svg>
  ),
  contacts: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 9a3 3 0 100-6 3 3 0 000 6zM2 17v-1a4 4 0 014-4h2a4 4 0 014 4v1M13 6a3 3 0 110 6M15 17v-1a4 4 0 00-2-3.5" />
    </svg>
  ),
  deals: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 2v16M6 6l-3 3 3 3M14 8l3 3-3 3M3 10h4M13 10h4" />
    </svg>
  ),
  invoices: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 2h10a1 1 0 011 1v14l-2.5-1.5L11 17l-2.5-1.5L6 17l-2.5-1.5L4 17V3a1 1 0 011-1zM7 6h6M7 9h6M7 12h4" />
    </svg>
  ),
  sales: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l4-4 3 2 4-5 3 3M17 8v5h-5" />
    </svg>
  ),
  viewingRooms: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 4C5.5 4 2 10 2 10s3.5 6 8 6 8-6 8-6-3.5-6-8-6z" />
      <circle cx="10" cy="10" r="2.5" />
    </svg>
  ),
  imageSharing: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 11l4-4-4-4M18 7H8a4 4 0 00-4 4v5" />
    </svg>
  ),
  analytics: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 17V10M7 17V7M11 17V11M15 17V5M19 17V8" />
    </svg>
  ),
  emailLog: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h14a1 1 0 011 1v9a1 1 0 01-1 1H3a1 1 0 01-1-1V6a1 1 0 011-1z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 5l8 6 8-6" />
    </svg>
  ),
  settings: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.2 12.2a1.2 1.2 0 00.2 1.3l.04.04a1.44 1.44 0 11-2.04 2.04l-.04-.04a1.2 1.2 0 00-1.3-.2 1.2 1.2 0 00-.72 1.1v.12a1.44 1.44 0 01-2.88 0v-.06a1.2 1.2 0 00-.78-1.1 1.2 1.2 0 00-1.3.2l-.04.04a1.44 1.44 0 11-2.04-2.04l.04-.04a1.2 1.2 0 00.2-1.3 1.2 1.2 0 00-1.1-.72h-.12a1.44 1.44 0 010-2.88h.06a1.2 1.2 0 001.1-.78 1.2 1.2 0 00-.2-1.3l-.04-.04a1.44 1.44 0 112.04-2.04l.04.04a1.2 1.2 0 001.3.2h.06a1.2 1.2 0 00.72-1.1v-.12a1.44 1.44 0 012.88 0v.06a1.2 1.2 0 00.72 1.1 1.2 1.2 0 001.3-.2l.04-.04a1.44 1.44 0 112.04 2.04l-.04.04a1.2 1.2 0 00-.2 1.3v.06a1.2 1.2 0 001.1.72h.12a1.44 1.44 0 010 2.88h-.06a1.2 1.2 0 00-1.1.72z" />
    </svg>
  ),
};

// ---------------------------------------------------------------------------
// Navigation definition (mirrors Sidebar)
// ---------------------------------------------------------------------------
const navSections: NavSection[] = [
  {
    title: 'INVENTORY',
    items: [
      { label: 'Dashboard', to: '/', icon: icons.dashboard, roles: ['admin', 'gallery', 'collector'] },
      { label: 'Artworks', to: '/artworks', icon: icons.artworks, roles: ['admin', 'gallery', 'collector'] },
      { label: 'Galleries', to: '/galleries', icon: icons.galleries, roles: ['admin'] },
      { label: 'Production Orders', to: '/production-orders', icon: icons.production, roles: ['admin'] },
    ],
  },
  {
    title: 'DOCUMENTS',
    items: [
      { label: 'Certificates', to: '/certificates', icon: icons.certificate, roles: ['admin', 'collector'] },
      { label: 'Deliveries', to: '/deliveries', icon: icons.delivery, roles: ['admin', 'gallery'] },
      { label: 'Packing Lists', to: '/packing-lists', icon: icons.packingList, roles: ['admin'] },
      { label: 'Catalogues', to: '/catalogues', icon: icons.catalogue, roles: ['admin'] },
    ],
  },
  {
    title: 'SALES & CRM',
    items: [
      { label: 'Contacts', to: '/contacts', icon: icons.contacts, roles: ['admin'] },
      { label: 'Deals', to: '/deals', icon: icons.deals, roles: ['admin'] },
      { label: 'Invoices', to: '/invoices', icon: icons.invoices, roles: ['admin'] },
      { label: 'Sales', to: '/sales', icon: icons.sales, roles: ['admin', 'gallery'] },
    ],
  },
  {
    title: 'SHARING',
    items: [
      { label: 'Viewing Rooms', to: '/viewing-rooms', icon: icons.viewingRooms, roles: ['admin', 'gallery'] },
      { label: 'Image Sharing', to: '/image-sharing', icon: icons.imageSharing, roles: ['admin'] },
    ],
  },
  {
    title: 'ANALYTICS',
    items: [
      { label: 'Analytics', to: '/analytics', icon: icons.analytics, roles: ['admin'] },
    ],
  },
];

const bottomItems: NavItem[] = [
  { label: 'Email Log', to: '/email-log', icon: icons.emailLog, roles: ['admin'] },
  { label: 'Settings', to: '/settings', icon: icons.settings, roles: ['admin'] },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getCurrentRole(): UserRole {
  return 'admin';
}

function filterByRole(items: NavItem[], role: UserRole): NavItem[] {
  return items.filter((item) => item.roles.includes(role));
}

// ---------------------------------------------------------------------------
// MobileNav component
// ---------------------------------------------------------------------------
export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const { user, signOut } = useAuth();
  const role = getCurrentRole();

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
          'fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transition-transform duration-300 ease-in-out lg:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-primary-100 px-6">
          <div>
            <span className="font-display text-xl font-bold text-primary-900">NOA</span>
            <p className="text-[10px] font-medium tracking-widest text-primary-400">INVENTORY</p>
          </div>
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
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {navSections.map((section) => {
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
