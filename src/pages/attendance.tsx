import { useMemo, useState } from 'react';
import { formatDateTime } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { PageHeader, Select } from '@/components/ui/primitives';
import { DataTable, Pagination, type Column } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAttendance, useBranches } from '@/lib/api/hooks';
import type { AttendanceRow, MemberRow } from '@/lib/api/types';
import i18n from '@/i18n';

const RANGES = ['today', 'week', 'month', ''];

export function AttendancePage() {
  const { t } = useTranslation();
  const lng = i18n.language;
  const [range, setRange] = useState('today');
  const [branchId, setBranchId] = useState('');
  const [page, setPage] = useState(1);
  const { data: branches = [] } = useBranches();

  const params = useMemo(
    () => ({ range: range || undefined, branchId: branchId || undefined, page, limit: 25 }),
    [range, branchId, page],
  );
  const { data, isLoading, isFetching, isError, refetch } = useAttendance(params);

  const cols: Column<AttendanceRow>[] = [
    {
      key: 'member',
      header: t('attendance.member'),
      cell: (a) => {
        const m = a.member as MemberRow;
        return typeof m === 'object'
          ? `${m.user?.firstName ?? ''} ${m.user?.lastName ?? ''} · ${m.memberCode}`
          : '—';
      },
    },
    { key: 'time', header: t('attendance.checkin'), cell: (a) => formatDateTime(a.checkInAt) },
    { key: 'branch', header: t('attendance.branch'), cell: (a) => a.branch?.nameEn ?? '—' },
    { key: 'source', header: t('attendance.source'), cell: (a) => a.source.replaceAll('_', ' ').toLowerCase() },
    {
      key: 'status',
      header: t('attendance.result'),
      cell: (a) => <StatusBadge value={a.accessStatus} kind="access" />,
    },
  ];

  return (
    <div>
      <PageHeader title={t('attendance.title')} />
      <div className="mb-4 flex gap-2">
        <Select className="w-40" value={range} onChange={(e) => { setRange(e.target.value); setPage(1); }}>
          {RANGES.map((r) => (
            <option key={r} value={r}>
              {r ? t(`reports.${r === 'today' ? 'daily' : r === 'week' ? 'weekly' : 'monthly'}`, r) : t('status.allTime')}
            </option>
          ))}
        </Select>
        <Select className="w-44" value={branchId} onChange={(e) => { setBranchId(e.target.value); setPage(1); }}>
          <option value="">{t('status.allBranches')}</option>
          {branches.map((b) => (
            <option key={b._id} value={b._id}>
              {lng === 'ar' ? b.nameAr : b.nameEn}
            </option>
          ))}
        </Select>
      </div>
      <DataTable
        columns={cols}
        rows={data?.data}
        rowKey={(a) => a._id}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        onRetry={refetch}
        emptyLabel={t('attendance.noCheckins')}
      />
      {data && (
        <Pagination page={data.meta.page} pages={data.meta.pages} total={data.meta.total} onPage={setPage} />
      )}
    </div>
  );
}
