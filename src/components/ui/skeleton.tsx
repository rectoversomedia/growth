'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'rect' | 'circle';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className, variant = 'rect', width, height, style, ...props }: SkeletonProps) {
  const variants = {
    text: 'rounded h-4',
    rect: 'rounded-lg',
    circle: 'rounded-full',
  };

  return (
    <div
      className={cn(
        'animate-pulse bg-slate-200',
        variants[variant],
        className
      )}
      style={{ width, height, ...style }}
      {...props}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton variant="circle" width={40} height={40} />
        <div className="space-y-2 flex-1">
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" />
        </div>
      </div>
      <Skeleton variant="rect" height={120} />
      <div className="flex gap-2">
        <Skeleton variant="rect" width={80} height={28} />
        <Skeleton variant="rect" width={80} height={28} />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border-b border-slate-100">
          <Skeleton variant="rect" width={32} height={32} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width={`${60 + (i * 7) % 30}%`} />
            <Skeleton variant="text" width="40%" />
          </div>
          <Skeleton variant="rect" width={64} height={24} />
        </div>
      ))}
    </div>
  );
}
