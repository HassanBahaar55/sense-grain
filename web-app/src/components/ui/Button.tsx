'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'outline' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  fullWidth?: boolean;
  isLoading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: [
    'bg-[#1f5135] text-white',
    'hover:bg-[#174028] hover:shadow-lg',
    'active:bg-[#12301e] active:scale-[0.98] active:shadow-md',
    'shadow-md',
  ].join(' '),
  outline: [
    'border border-gray-200 bg-white text-gray-700',
    'hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900',
    'active:bg-gray-100 active:scale-[0.98]',
    'shadow-sm',
  ].join(' '),
  ghost: [
    'text-gray-600',
    'hover:bg-gray-100 hover:text-gray-800',
    'active:bg-gray-200 active:scale-[0.98]',
  ].join(' '),
};

const sizeClasses: Record<Size, string> = {
  sm: 'text-sm px-4 py-2 rounded-lg',
  md: 'text-sm px-5 py-2.5 rounded-xl',
  lg: 'text-[15px] px-6 py-3.5 rounded-xl',
};

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  fullWidth = false,
  isLoading = false,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2.5 font-semibold select-none',
        'transition-all duration-150 ease-out cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f5135]/50 focus-visible:ring-offset-2',
        'disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin h-4 w-4 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
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
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
