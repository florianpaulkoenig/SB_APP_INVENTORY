import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';

// ---------------------------------------------------------------------------
// AppLayout -- main authenticated layout
// ---------------------------------------------------------------------------
export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Desktop sidebar -- hidden on mobile */}
      <div className="hidden lg:block">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((prev) => !prev)}
        />
      </div>

      {/* Mobile navigation overlay */}
      <MobileNav
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main content area */}
      <div
        className={cn(
          'flex flex-1 flex-col overflow-hidden transition-all duration-200',
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64',
        )}
      >
        {/* Top bar */}
        <Topbar onMenuToggle={() => setMobileMenuOpen((prev) => !prev)} />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
