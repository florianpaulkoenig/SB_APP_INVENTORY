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
        'rounded-none border border-primary-100 bg-white',
        hoverable &&
          'cursor-pointer transition-colors hover:border-primary-300',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </div>
  );
}
