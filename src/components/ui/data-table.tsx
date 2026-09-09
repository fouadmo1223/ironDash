import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Inbox, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  align?: 'start' | 'center' | 'end';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  isLoading?: boolean;
  /** Background refetch (filter/page change) — dims the current rows without a full skeleton. */
  isFetching?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onRowClick?: (row: T) => void;
  emptyLabel?: string;
  /** Tighter row padding + smaller text — for log-style tables. */
  dense?: boolean;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  isFetching,
  isError,
  onRetry,
  onRowClick,
  emptyLabel,
  dense,
}: DataTableProps<T>) {
  const { t } = useTranslation();
  const busy = Boolean(isFetching) && !isLoading && Boolean(rows?.length);
  const cellPad = dense ? 'px-2.5 py-1.5' : 'px-3 py-2.5';
  return (
    <div className="relative overflow-x-auto rounded-lg border border-border">
      {busy && (
        <>
          <div className="absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden">
            <div className="h-full w-1/3 animate-[dt-bar_1s_ease-in-out_infinite] bg-accent" />
          </div>
          <div className="pointer-events-none absolute inset-0 z-10 animate-pulse bg-surface/40" />
        </>
      )}
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-raised text-xs uppercase tracking-wide text-muted-foreground">
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  'whitespace-nowrap font-semibold',
                  cellPad,
                  dense && 'text-[11px]',
                  c.align === 'end' && 'text-end',
                  c.align === 'center' && 'text-center',
                  !c.align && 'text-start',
                  c.className,
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading &&
            Array.from({ length: 6 }).map((_, r) => (
              <tr key={r} className="border-b border-border/60 last:border-0">
                {columns.map((c, ci) => (
                  <td key={c.key} className="px-3 py-3.5">
                    <Skeleton
                      className={cn(
                        'h-3.5',
                        ci === 0 ? 'w-32' : c.align === 'end' ? 'ms-auto w-16' : 'w-20',
                      )}
                    />
                  </td>
                ))}
              </tr>
            ))}
          {!isLoading && isError && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-16 text-center">
                <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-danger" />
                <p className="text-sm text-muted-foreground">{t('common.failedToLoad')}</p>
                {onRetry && (
                  <button onClick={onRetry} className="mt-2 text-sm font-semibold text-accent">
                    {t('common.retry')}
                  </button>
                )}
              </td>
            </tr>
          )}
          {!isLoading && !isError && rows && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-16 text-center text-muted-foreground">
                <Inbox className="mx-auto mb-2 h-6 w-6" />
                <p className="text-sm">{emptyLabel ?? t('common.noRecords')}</p>
              </td>
            </tr>
          )}
          {!isLoading &&
            !isError &&
            rows?.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'border-b border-border/60 last:border-0 transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-muted/50',
                )}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      cellPad,
                      'align-middle',
                      c.align === 'end' && 'text-end',
                      c.align === 'center' && 'text-center',
                      c.className,
                    )}
                  >
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({
  page,
  pages,
  total,
  onPage,
}: {
  page: number;
  pages: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const { t } = useTranslation();
  if (total === 0) return null;
  return (
    <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
      <span>{t('common.pageOf', { page, pages, total })}</span>
      <div className="flex gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="rounded-md border border-border px-3 py-1 disabled:opacity-40 hover:bg-muted"
        >
          {t('common.prev')}
        </button>
        <button
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          className="rounded-md border border-border px-3 py-1 disabled:opacity-40 hover:bg-muted"
        >
          {t('common.next')}
        </button>
      </div>
    </div>
  );
}
