'use client';

import * as React from 'react';
import { CaretDown } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  error?: string;
}

export function Select({ label, options, value, onChange, placeholder = 'Select...', className, error }: SelectProps) {
  return (
    <div className={cn('w-full', className)}>
      {label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}
      <div className="relative">
        <select
          value={value ?? ''}
          onChange={e => onChange?.(e.target.value)}
          className={cn(
            'flex h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 pr-10 text-sm',
            'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-red-400',
            !value && 'text-slate-400'
          )}
        >
          <option value="" disabled>{placeholder}</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <CaretDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
