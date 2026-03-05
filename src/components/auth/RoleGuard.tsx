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

  if (loading) return null;

  // Default to admin if no profile exists yet
  const currentRole = role ?? 'admin';

  if (!allowed.includes(currentRole)) {
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
