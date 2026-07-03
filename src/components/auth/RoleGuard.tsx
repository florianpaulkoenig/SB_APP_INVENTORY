import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '../../types/database';

interface RoleGuardProps {
  children: ReactNode;
  allowed: UserRole[];
  fallback?: string; // redirect path, defaults to '/'
}

export function RoleGuard({ children, allowed, fallback = '/' }: RoleGuardProps) {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" />
      </div>
    );
  }

  // If role is null (no profile or unauthenticated), deny access.
  // Gallery users get sent to their portal instead of '/', which is
  // admin-only and would otherwise redirect back here in a loop.
  if (!role || !allowed.includes(role)) {
    const target = role === 'gallery' && fallback === '/' ? '/gallery/dashboard' : fallback;
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
}
