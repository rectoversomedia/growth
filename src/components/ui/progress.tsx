'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ProgressProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
}

export function Progress({
  value,
  max = 100,
  label,
  showValue,
  size = 'md',
  variant = 'default',
  className,
}: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  const sizes = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' };
  const variants = {
    default: 'bg-brand-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
  };

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && <span className="text-sm text-slate-600">{label}</span>}
          {showValue && <span className="text-sm font-medium text-slate-700">{Math.round(pct)}%</span>}
        </div>
      )}
      <div className={cn('w-full bg-slate-100 rounded-full overflow-hidden', sizes[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', variants[variant])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
