import { type CSSProperties, type ReactNode, type Ref } from 'react';
import { cn } from '../../lib/utils';

export interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
  style?: CSSProperties;
  ref?: Ref<HTMLDivElement>;
}

export function Card({ children, className, onClick, hoverable, style, ref }: CardProps) {
  return (
    <div
      ref={ref}
      style={style}
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
