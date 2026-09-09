import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/ui/primitives';
import { DataTable, Pagination, type Column } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { usePayments } from '@/lib/api/hooks';
import type { MemberRow, PaymentRow } from '@/lib/api/types';
import { cn, formatCurrency, formatDateTime } from '@/lib/utils';
import i18n from '@/i18n';

const TAB_KEYS = ['under_review', 'approved', 'rejected', 'fake', 'refund_requested', 'refunded', 'all'] as const;

function memberName(m: MemberRow | string) {
  return typeof m === 'object' ? `${m.user?.firstName ?? ''} ${m.user?.lastName ?? ''}`.trim() : '—';
}
function memberPhone(m: MemberRow | string) {
  return typeof m === 'object' ? m.user?.phone ?? '' : '';
}

export function PaymentsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const lng = i18n.language;
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') ?? 'under_review';
  const [page, setPage] = useState(1);

  const params = useMemo(() => ({ tab, page, limit: 20 }), [tab, page]);
  const { data, isLoading, isFetching, isError, refetch } = usePayments(params);

  const setTab = (key: string) => {
    const next = new URLSearchParams(sp);
    next.set('tab', key);
    setSp(next, { replace: true });
    setPage(1);
  };

  const columns: Column<PaymentRow>[] = [
    {
      key: 'member',
      header: t('payments.member'),
      cell: (p) => (
        <div>
          <div className="font-medium">{memberName(p.member)}</div>
          <div className="text-xs text-muted-foreground" dir="ltr">
            {memberPhone(p.member)}
          </div>
        </div>
      ),
    },
    {
      key: 'plan',
      header: t('payments.plan'),
      cell: (p) => (typeof p.subscription === 'object' ? p.subscription.planNameEn : '—'),
    },
    { key: 'expected', header: t('payments.expected'), align: 'end', cell: (p) => formatCurrency(p.expectedAmount, lng) },
    {
      key: 'amount',
      header: t('payments.submitted'),
      align: 'end',
      cell: (p) => (
        <span className={cn(p.amount < p.expectedAmount && 'text-warning')}>
          {formatCurrency(p.amount, lng)}
        </span>
      ),
    },
    { key: 'method', header: t('payments.method'), cell: (p) => p.paymentMethodLabel || '—' },
    { key: 'date', header: t('payments.submittedAt'), cell: (p) => formatDateTime(p.createdAt) },
    { key: 'status', header: t('payments.status'), cell: (p) => <StatusBadge value={p.status} kind="payment" /> },
  ];

  return (
    <div>
      <PageHeader title={t('nav.payments')} />

      <div className="mb-4 flex flex-wrap gap-1 border-b border-border">
        {TAB_KEYS.map((tbKey) => (
          <button
            key={tbKey}
            onClick={() => setTab(tbKey)}
            className={cn(
              'px-3 py-2 text-sm font-medium transition-colors',
              tab === tbKey
                ? 'border-b-2 border-accent text-accent'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t(`payments.tab.${tbKey}`)}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={data?.data}
        rowKey={(p) => p._id}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        onRetry={refetch}
        onRowClick={(p) => navigate(`/payments/${p._id}`)}
        emptyLabel={t('payments.noneInTab')}
      />
      {data && (
        <Pagination page={data.meta.page} pages={data.meta.pages} total={data.meta.total} onPage={setPage} />
      )}
    </div>
  );
}
