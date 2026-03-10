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

  // If role is null (no profile or unauthenticated), deny access
  if (!role || !allowed.includes(role)) {
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
