import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export function Card({ children, className, onClick, hoverable }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-lg border border-primary-100 bg-white shadow-sm',
        hoverable &&
          'cursor-pointer transition-shadow hover:shadow-md hover:border-primary-200',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </div>
  );
}
