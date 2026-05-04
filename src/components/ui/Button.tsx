import { type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

const variantStyles = {
  primary: 'bg-primary-900 text-white hover:bg-primary-700 active:bg-primary-950',
  secondary: 'bg-transparent text-primary-900 border border-primary-300 hover:border-primary-600 active:bg-primary-50',
  outline:
    'border border-primary-300 text-primary-700 hover:border-primary-600 hover:text-primary-900 active:bg-primary-50',
  ghost: 'text-primary-500 hover:text-primary-900 active:text-primary-900',
  danger: 'bg-danger text-white hover:bg-red-600 active:bg-red-700',
} as const;

const sizeStyles = {
  sm: 'px-4 py-1.5 text-[10px]',
  md: 'px-5 py-2.5 text-[10px]',
  lg: 'px-8 py-3 text-xs',
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantStyles;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-none font-medium uppercase tracking-widest transition-colors focus:outline-none focus:ring-1 focus:ring-accent focus:ring-offset-1',
        variantStyles[variant],
        sizeStyles[size],
        isDisabled && 'cursor-not-allowed opacity-50',
        className,
      )}
      {...props}
    >
      {loading && (
        <svg
          className="h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
