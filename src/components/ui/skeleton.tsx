import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

/** A single shimmering placeholder block. */
export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div style={style} className={cn('animate-pulse rounded-md bg-muted', className)} />;
}

/* ─────────────────────────── Composed templates ─────────────────────────── */

/** Rows + header bar for a data table. */
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex gap-4 border-b border-border bg-surface-raised px-3 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-border/60 px-3 py-3.5 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className={cn('h-3.5 flex-1', c === 0 && 'max-w-[140px]', c === cols - 1 && 'max-w-[70px]')}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Grid of card placeholders (plans, roles, methods, media…). */
export function CardsSkeleton({ count = 6, lines = 3 }: { count?: number; lines?: number }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-12" />
          </div>
          <Skeleton className="mt-3 h-7 w-24" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: lines }).map((_, l) => (
              <Skeleton key={l} className="h-3 w-full" style={undefined} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** KPI stat row. */
export function KpiSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border p-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Chart panel placeholder — title + a rising bar silhouette. */
export function ChartSkeleton({ height = 240 }: { height?: number }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <Skeleton className="mb-4 h-3 w-32" />
      <div className="flex items-end gap-2" style={{ height }}>
        {[40, 65, 50, 80, 55, 90, 70, 100, 60, 85].map((h, i) => (
          <Skeleton key={i} className="flex-1" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

/** Two-column detail / form placeholder. */
export function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-3 rounded-lg border border-border p-4 md:col-span-2">
          <Skeleton className="h-3 w-32" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3.5 w-32" />
            </div>
          ))}
        </div>
        <div className="space-y-3 rounded-lg border border-border p-4">
          <Skeleton className="h-3 w-24" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-3.5 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Stacked form fields. */
export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Skeleton className="h-7 w-48" />
      <div className="grid gap-4 rounded-lg border border-border p-5 sm:grid-cols-2">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
