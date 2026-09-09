import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '@/lib/utils';
import { PageHeader, Input } from '@/components/ui/primitives';
import { DataTable, Pagination, type Column } from '@/components/ui/data-table';
import { Dialog } from '@/components/ui/dialog';
import { useAudit } from '@/lib/api/hooks';
import { cn } from '@/lib/utils';

interface AuditRow {
  _id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  userLabel?: string;
  user?: { firstName: string; lastName: string; email?: string } | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export function AuditPage() {
  const { t } = useTranslation();
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AuditRow | null>(null);

  const params = useMemo(
    () => ({ page, limit: 40, action: action || undefined, entityType: entityType || undefined }),
    [page, action, entityType],
  );
  const { data, isLoading, isFetching, isError, refetch } = useAudit(params);

  const actorName = (r: AuditRow) =>
    r.userLabel || (r.user ? `${r.user.firstName} ${r.user.lastName}`.trim() : t('audit.system'));

  const cols: Column<AuditRow>[] = [
    {
      key: 'time',
      header: t('audit.when'),
      cell: (r) => <span className="whitespace-nowrap tabular-nums">{formatDateTime(r.createdAt)}</span>,
    },
    {
      key: 'action',
      header: t('audit.action'),
      cell: (r) => (
        <span className="font-medium">
          {t(`auditAction.${r.action}`, { defaultValue: r.action.replaceAll('_', ' ').toLowerCase() })}
        </span>
      ),
    },
    {
      key: 'entity',
      header: t('audit.entity'),
      cell: (r) => (
        <span>
          {t(`auditEntity.${r.entityType}`, { defaultValue: r.entityType })}
          {r.entityId && (
            <code className="ms-1.5 text-[11px] text-muted-foreground">…{String(r.entityId).slice(-6)}</code>
          )}
        </span>
      ),
    },
    { key: 'actor', header: t('audit.by'), cell: (r) => actorName(r) },
    {
      key: 'ip',
      header: t('audit.ip'),
      cell: (r) => <span className="text-xs text-muted-foreground" dir="ltr">{r.ipAddress || '—'}</span>,
      className: 'hidden lg:table-cell',
    },
  ];

  return (
    <div>
      <PageHeader title={t('audit.title')} description={t('audit.desc')} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          className="w-56"
          placeholder={t('audit.actionFilter')}
          value={action}
          onChange={(e) => {
            setAction(e.target.value.toUpperCase());
            setPage(1);
          }}
        />
        <Input
          className="w-48"
          placeholder={t('audit.entityFilter')}
          value={entityType}
          onChange={(e) => {
            setEntityType(e.target.value);
            setPage(1);
          }}
        />
      </div>
      <DataTable
        dense
        columns={cols}
        rows={data?.data as unknown as AuditRow[] | undefined}
        rowKey={(r) => r._id}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        onRetry={refetch}
        onRowClick={(r) => setSelected(r)}
      />
      {data && (
        <Pagination page={data.meta.page} pages={data.meta.pages} total={data.meta.total} onPage={setPage} />
      )}

      <Dialog
        open={!!selected}
        onClose={() => setSelected(null)}
        title={
          selected
            ? t(`auditAction.${selected.action}`, {
                defaultValue: selected.action.replaceAll('_', ' ').toLowerCase(),
              })
            : ''
        }
        size="lg"
      >
        {selected && <AuditDetail row={selected} actorName={actorName(selected)} />}
      </Dialog>
    </div>
  );
}

function AuditDetail({ row, actorName }: { row: AuditRow; actorName: string }) {
  const { t } = useTranslation();
  const meta = row.metadata && Object.keys(row.metadata).length ? row.metadata : null;
  const changed = diffKeys(row.before, row.after);

  return (
    <div className="space-y-4 text-sm">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        <Row label={t('audit.when')} value={formatDateTime(row.createdAt)} />
        <Row
          label={t('audit.entity')}
          value={`${t(`auditEntity.${row.entityType}`, { defaultValue: row.entityType })}${
            row.entityId ? ` · ${row.entityId}` : ''
          }`}
        />
        <Row label={t('audit.by')} value={actorName} />
        <Row label={t('audit.email')} value={row.user?.email || '—'} />
        <Row label={t('audit.ip')} value={row.ipAddress || '—'} ltr />
        <Row label={t('audit.actionRaw')} value={row.action} ltr />
      </dl>

      {row.userAgent && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('audit.device')}
          </p>
          <p className="break-words rounded-md bg-muted/50 p-2 text-xs" dir="ltr">
            {row.userAgent}
          </p>
        </div>
      )}

      {changed.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('audit.changes')}
          </p>
          <div className="overflow-hidden rounded-md border border-border">
            <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 border-b border-border bg-surface-raised px-3 py-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
              <span>{t('audit.field')}</span>
              <span>{t('audit.before')}</span>
              <span>{t('audit.after')}</span>
            </div>
            {changed.map((k) => (
              <div key={k} className="grid grid-cols-[1fr_1fr_1fr] gap-2 border-b border-border/60 px-3 py-1.5 text-xs last:border-0">
                <code className="text-accent">{k}</code>
                <span className="break-words text-muted-foreground line-through decoration-danger/50">
                  {fmt((row.before ?? {})[k])}
                </span>
                <span className="break-words font-medium">{fmt((row.after ?? {})[k])}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {meta && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('audit.metadata')}
          </p>
          <pre className="max-h-56 overflow-auto rounded-md bg-muted/50 p-2 text-xs" dir="ltr">
            {JSON.stringify(meta, null, 2)}
          </pre>
        </div>
      )}

      {!changed.length && !meta && !row.userAgent && (
        <p className="text-muted-foreground">{t('audit.noExtra')}</p>
      )}
    </div>
  );
}

function Row({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('mt-0.5 break-words font-medium', ltr && 'font-mono text-xs')} dir={ltr ? 'ltr' : undefined}>
        {value}
      </dd>
    </div>
  );
}

function diffKeys(before?: Record<string, unknown> | null, after?: Record<string, unknown> | null): string[] {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  return [...keys].filter((k) => JSON.stringify((before ?? {})[k]) !== JSON.stringify((after ?? {})[k]));
}

function fmt(v: unknown): string {
  if (v === undefined || v === null) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
