'use client';

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const CONTROL =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 transition-colors ' +
  'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:bg-gray-50 disabled:text-gray-400';

export function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL, className)} {...rest} />;
}

export function TextArea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(CONTROL, className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(CONTROL, 'bg-white', className)} {...rest}>
      {children}
    </select>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
  className,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50',
        checked && 'border-blue-300 bg-blue-50 text-blue-700',
        className
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      {label}
    </label>
  );
}

/** 单选按钮组（用于轮换策略、导出格式这类少量互斥选项） */
export function RadioGroup<T extends string>({
  value,
  onChange,
  options,
  columns = 3,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; description?: string }>;
  columns?: number;
}) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-lg border px-3 py-2 text-left text-sm transition-colors',
            value === option.value
              ? 'border-blue-400 bg-blue-50 text-blue-700'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
          )}
        >
          <span className="block font-medium">{option.label}</span>
          {option.description && <span className="mt-0.5 block text-xs opacity-75">{option.description}</span>}
        </button>
      ))}
    </div>
  );
}
