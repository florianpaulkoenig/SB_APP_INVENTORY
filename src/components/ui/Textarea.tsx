import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="mb-1 block text-sm font-medium text-primary-700"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'w-full rounded-md border border-primary-200 bg-white px-3 py-2 text-sm text-primary-900 placeholder:text-primary-400 transition-colors',
            'focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none',
            error && 'border-danger focus:border-danger focus:ring-danger',
            props.disabled && 'cursor-not-allowed bg-primary-50 opacity-60',
            className,
          )}
          rows={4}
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

Textarea.displayName = 'Textarea';
