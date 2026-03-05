import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1 block text-sm font-medium text-primary-700"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-md border border-primary-200 bg-white px-3 py-2 text-sm text-primary-900 placeholder:text-primary-400 transition-colors',
            'focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none',
            error && 'border-danger focus:border-danger focus:ring-danger',
            props.disabled && 'cursor-not-allowed bg-primary-50 opacity-60',
            className,
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
        {!error && helperText && (
          <p className="mt-1 text-xs text-primary-400">{helperText}</p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
