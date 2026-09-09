import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { PageHeader, Select } from '@/components/ui/primitives';
import { DataTable, Pagination, type Column } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { useSubscriptions } from '@/lib/api/hooks';
import type { MemberRow, SubscriptionRow } from '@/lib/api/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import i18n from '@/i18n';

const STATUSES = [
  '',
  'PENDING_PAYMENT',
  'PAYMENT_UNDER_REVIEW',
  'ACTIVE',
  'EXPIRING_SOON',
  'EXPIRED',
  'FROZEN',
  'CANCELLED',
];

export function SubscriptionsPage() {
  const { t } = useTranslation();
  const lng = i18n.language;
  const [sp, setSp] = useSearchParams();
  const status = sp.get('status') ?? '';
  const [page, setPage] = useState(1);

  const params = useMemo(
    () => ({ page, limit: 20, status: status || undefined }),
    [page, status],
  );
  const { data, isLoading, isFetching, isError, refetch } = useSubscriptions(params);

  const cols: Column<SubscriptionRow>[] = [
    {
      key: 'member',
      header: t('subscriptions.member'),
      cell: (s) => {
        const m = s.member as MemberRow;
        return typeof m === 'object' ? (
          <div>
            <div className="font-medium">
              {m.user?.firstName} {m.user?.lastName}
            </div>
            <div className="text-xs text-muted-foreground">{m.memberCode}</div>
          </div>
        ) : (
          '—'
        );
      },
    },
    { key: 'plan', header: t('subscriptions.plan'), cell: (s) => (lng === 'ar' ? s.planNameAr : s.planNameEn) },
    {
      key: 'status',
      header: t('subscriptions.status'),
      cell: (s) => <StatusBadge value={s.effectiveStatus ?? s.status} kind="subscription" />,
    },
    {
      key: 'start',
      header: t('subscriptions.start'),
      cell: (s) => (s.startDate ? formatDate(s.startDate) : '—'),
    },
    {
      key: 'end',
      header: t('subscriptions.end'),
      cell: (s) => (s.endDate ? formatDate(s.endDate) : '—'),
    },
    { key: 'paid', header: t('subscriptions.paid'), align: 'end', cell: (s) => formatCurrency(s.paidAmount, lng) },
    {
      key: 'rem',
      header: t('subscriptions.balance'),
      align: 'end',
      cell: (s) => formatCurrency(s.remainingAmount, lng),
    },
  ];

  return (
    <div>
      <PageHeader title={t('subscriptions.title')} />
      <div className="mb-4">
        <Select
          className="w-56"
          value={status}
          onChange={(e) => {
            const n = new URLSearchParams(sp);
            e.target.value ? n.set('status', e.target.value) : n.delete('status');
            setSp(n, { replace: true });
            setPage(1);
          }}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s ? t(`statusLabel.${s}`, { defaultValue: s.replaceAll('_', ' ') }) : t('status.allStatuses')}
            </option>
          ))}
        </Select>
      </div>
      <DataTable
        columns={cols}
        rows={data?.data}
        rowKey={(s) => s._id}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        onRetry={refetch}
      />
      {data && (
        <Pagination
          page={data.meta.page}
          pages={data.meta.pages}
          total={data.meta.total}
          onPage={setPage}
        />
      )}
    </div>
  );
}
