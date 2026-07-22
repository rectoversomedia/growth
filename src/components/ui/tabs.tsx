'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface Tab {
  value: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function Tabs({ tabs, value, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex items-center gap-1 border-b border-slate-200', className)}>
      {tabs.map(tab => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all relative',
            value === tab.value
              ? 'text-brand-600'
              : 'text-slate-500 hover:text-slate-700'
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.count !== undefined && (
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded-full',
              value === tab.value ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500'
            )}>
              {tab.count}
            </span>
          )}
          {value === tab.value && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
}
