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
            className="mb-2 block text-[10px] font-medium uppercase tracking-widest text-primary-400"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-none border-0 border-b border-primary-200 bg-transparent px-0 py-2 text-sm text-primary-900 placeholder:text-primary-300 transition-colors',
            'focus:border-accent focus:outline-none',
            error && 'border-danger focus:border-danger',
            props.disabled && 'cursor-not-allowed opacity-40',
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
