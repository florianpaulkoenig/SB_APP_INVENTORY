import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getInitials } from '../../lib/utils';

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
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const userEmail = user?.email ?? '';
  const initials = userEmail ? getInitials(userEmail.split('@')[0].replace(/[._-]/g, ' ')) : '?';

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-primary-100 bg-white px-4 lg:px-6">
      {/* Left side */}
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={onMenuToggle}
          className="rounded-md p-2 text-primary-500 transition-colors hover:bg-primary-50 hover:text-primary-900 lg:hidden"
          aria-label="Toggle menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h14M3 10h14M3 15h14" />
          </svg>
        </button>

        {/* Page title / breadcrumb */}
        {title && (
          <h1 className="text-sm font-medium text-primary-700">{title}</h1>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Search button */}
        <button
          type="button"
          onClick={() => navigate('/artworks?search=1')}
          className="rounded-md p-2 text-primary-400 transition-colors hover:bg-primary-50 hover:text-primary-700"
          aria-label="Search"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path strokeLinecap="round" d="M13 13l4 4" />
          </svg>
        </button>

        {/* Notification bell */}
        <button
          type="button"
          className="rounded-md p-2 text-primary-400 transition-colors hover:bg-primary-50 hover:text-primary-700"
          aria-label="Notifications"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 2a5 5 0 00-5 5v3l-1.5 2.5h13L15 10V7a5 5 0 00-5-5zM8 15.5a2 2 0 004 0" />
          </svg>
        </button>

        {/* User avatar dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-900 text-xs font-medium text-white transition-colors hover:bg-primary-800"
            aria-label="User menu"
          >
            {initials}
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-primary-100 bg-white py-2 shadow-lg">
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
  );
}
