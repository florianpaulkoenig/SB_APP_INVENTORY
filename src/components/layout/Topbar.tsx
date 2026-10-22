import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getInitials } from '../../lib/utils';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { GlobalSearchOverlay } from './GlobalSearchOverlay';
import { bottomItems, getNavSections, PORTFOLIO_LABELS } from './navConfig';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TopbarProps {
  onMenuToggle: () => void;
  title?: string;
}

// ---------------------------------------------------------------------------
// Topbar component
// ---------------------------------------------------------------------------
export function Topbar({ onMenuToggle, title }: TopbarProps) {
  const { pathname } = useLocation();
  const { portfolio } = usePortfolio();
  const { user, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cmd+K / Ctrl+K keyboard shortcut to open search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dossier-style running header: "SECTION · PAGE" of the deepest matching nav entry
  const current = getNavSections(portfolio)
    .flatMap((section) => section.items.map((item) => ({ section: section.title, item })))
    .concat(bottomItems.map((item) => ({ section: '', item })))
    .filter(({ item }) => item.to === '/' ? pathname === '/' : pathname === item.to || pathname.startsWith(item.to + '/'))
    .sort((a, b) => b.item.to.length - a.item.to.length)[0];
  const runningHeader = title
    ?? (current ? [current.section, current.item.label].filter(Boolean).join(' · ') : PORTFOLIO_LABELS[portfolio].name);

  const userEmail = user?.email ?? '';
  const initials = userEmail ? getInitials(userEmail.split('@')[0].replace(/[._-]/g, ' ')) : '?';

  return (
    <>
    <header className="flex h-16 shrink-0 items-center justify-between bg-black px-4 text-white lg:px-8">
      {/* Left side */}
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={onMenuToggle}
          className="p-2 text-white/70 transition-colors hover:text-white lg:hidden"
          aria-label="Toggle menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h14M3 10h14M3 15h14" />
          </svg>
        </button>

        {/* Brand — the sidebar carries it on desktop */}
        <span className="font-display text-lg text-white lg:hidden">NOA Contemporary</span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Running header, as on every dossier page */}
        <span className="mr-4 hidden truncate text-[10px] font-medium uppercase tracking-[0.25em] text-white/80 md:block">
          {runningHeader}
        </span>

        {/* Search button */}
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="p-2 text-white/60 transition-colors hover:text-white"
          aria-label="Search"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path strokeLinecap="round" d="M13 13l4 4" />
          </svg>
        </button>

        {/* User avatar dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-semibold text-black transition-colors hover:bg-primary-200"
            aria-label="User menu"
          >
            {initials}
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-48 border border-black bg-white py-2 text-primary-900 sm:w-56">
              <div className="border-b border-primary-100 px-4 pb-2">
                <p className="truncate text-sm font-medium text-primary-900">{userEmail}</p>
                <p className="text-xs text-primary-400">Admin</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  signOut();
                }}
                className="mt-1 flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-primary-600 transition-colors hover:bg-primary-50 hover:text-primary-900"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 3h3a1 1 0 011 1v12a1 1 0 01-1 1h-3M9 15l-4-5 4-5M5 10h9" />
                </svg>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
    <GlobalSearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
