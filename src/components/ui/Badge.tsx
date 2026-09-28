import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';

const variantStyles = {
  default: 'bg-primary-100 text-primary-700',
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
} as const;

export interface BadgeProps {
  children: ReactNode;
  variant?: keyof typeof variantStyles;
  className?: string;
}

export function Badge({
  children,
  variant = 'default',
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-none px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]',
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
