'use client';

import { InputHTMLAttributes, ReactNode, forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  leftIcon?: ReactNode;
  rightElement?: ReactNode;
  error?: string;
  hint?: string;
}

function ErrorIcon() {
  return (
    <svg
      className="w-3 h-3 flex-shrink-0"
      viewBox="0 0 12 12"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M6 0a6 6 0 1 0 0 12A6 6 0 0 0 6 0zm0 9a.75.75 0 1 1 0-1.5A.75.75 0 0 1 6 9zm.75-3.75a.75.75 0 1 1-1.5 0V3.75a.75.75 0 1 1 1.5 0V5.25z" />
    </svg>
  );
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { label, leftIcon, rightElement, error, hint, className, id, disabled, ...props },
    ref,
  ) => {
    const uid = useId();
    const inputId = id ?? uid;
    const errorId = error ? `${inputId}-error` : undefined;
    const hintId = hint ? `${inputId}-hint` : undefined;
    const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'block text-sm font-semibold transition-colors duration-200',
              disabled ? 'text-gray-400' : 'text-gray-800',
            )}
          >
            {label}
          </label>
        )}

        <div className="relative group">
          {/* Left icon */}
          {leftIcon && (
            <div
              className={cn(
                'absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200',
                disabled
                  ? 'text-gray-300'
                  : 'text-gray-400 group-focus-within:text-[#1f5135]',
              )}
            >
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(
              'w-full rounded-xl border py-3 text-[15px] text-gray-900 placeholder:text-gray-400',
              'transition-all duration-200 outline-none',
              // Default state
              'border-gray-200 bg-gray-50/80',
              // Hover
              'hover:border-gray-300',
              // Focus
              'focus:ring-2 focus:bg-white',
              error
                ? 'focus:ring-red-200 focus:border-red-400'
                : 'focus:ring-[#1f5135]/20 focus:border-[#1f5135]',
              // Error border (unfocused)
              error ? 'border-red-300 bg-red-50/30' : '',
              // Disabled
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:border-gray-200',
              // Icon padding
              leftIcon ? 'pl-11' : 'pl-4',
              rightElement ? 'pr-12' : 'pr-4',
              className,
            )}
            {...props}
          />

          {/* Right element (e.g. eye toggle) */}
          {rightElement && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
              {rightElement}
            </div>
          )}
        </div>

        {/* Error message — re-keyed to replay animation when text changes */}
        {error && (
          <p
            key={error}
            id={errorId}
            role="alert"
            className="animate-fade-slide-in flex items-center gap-1.5 text-xs font-medium text-red-500"
          >
            <ErrorIcon />
            {error}
          </p>
        )}

        {/* Hint text (shown when no error) */}
        {hint && !error && (
          <p id={hintId} className="text-xs text-gray-400">
            {hint}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';
