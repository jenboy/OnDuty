'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500',
  secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:text-gray-400',
  ghost: 'text-gray-600 hover:bg-gray-100 disabled:text-gray-300',
  danger: 'bg-red-50 text-red-600 hover:bg-red-100 disabled:text-red-300',
};

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

export function Button({ variant = 'secondary', size = 'md', icon, className, children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500',
        'disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

/** 图标按钮（必须有 aria-label，否则读屏软件只有一个"按钮"） */
export function IconButton({
  label,
  icon,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; icon: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center rounded-lg p-2 text-gray-500 transition-colors',
        'hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500',
        className
      )}
      {...rest}
    >
      {icon}
    </button>
  );
}
