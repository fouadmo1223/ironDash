import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Loader2 } from 'lucide-react';
import { PageHeader, Input, Select, Field } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { DataTable, Pagination, type Column } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { useToast } from '@/components/ui/toast';
import { useBranches, useMembers } from '@/lib/api/hooks';
import { api, apiError, unwrap } from '@/lib/api';
import type { MemberRow } from '@/lib/api/types';
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils';
import i18n from '@/i18n';

const STATUS_FILTERS = [
  '',
  'active',
  'expiring_soon',
  'expired',
  'frozen',
  'none',
  'pending_payment',
  'payment_under_review',
  'outstanding',
];

export function MembersListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const lng = i18n.language;
  const [sp, setSp] = useSearchParams();

  const [search, setSearch] = useState(sp.get('search') ?? '');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const branchId = sp.get('branchId') ?? '';
  const status = sp.get('status') ?? '';

  const { data: branches = [] } = useBranches();
  const params = useMemo(
    () => ({ page, limit: 20, search: search || undefined, branchId: branchId || undefined, status: status || undefined }),
    [page, search, branchId, status],
  );
  const { data, isLoading, isFetching, isError, refetch } = useMembers(params);

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(sp);
    if (value) next.set(key, value);
    else next.delete(key);
    setSp(next, { replace: true });
    setPage(1);
  };

  const columns: Column<MemberRow>[] = [
    {
      key: 'member',
      header: t('nav.members'),
      cell: (m) => (
        <div>
          <div className="font-medium">
            {m.user?.firstName} {m.user?.lastName}
          </div>
          <div className="text-xs text-muted-foreground">{m.memberCode}</div>
        </div>
      ),
    },
    { key: 'phone', header: t('members.phone'), cell: (m) => <span dir="ltr">{m.user?.phone ?? '—'}</span> },
    {
      key: 'plan',
      header: t('members.plan'),
      cell: (m) =>
        m.currentSubscription && typeof m.currentSubscription === 'object'
          ? lng === 'ar'
            ? m.currentSubscription.planNameAr
            : m.currentSubscription.planNameEn
          : '—',
    },
    {
      key: 'status',
      header: t('members.status'),
      cell: (m) =>
        m.currentSubscription && typeof m.currentSubscription === 'object' ? (
          <StatusBadge value={m.currentSubscription.status} kind="subscription" />
        ) : (
          <span className="text-xs text-muted-foreground">{t('status.noSubscription')}</span>
        ),
    },
    {
      key: 'expiry',
      header: t('members.expiry'),
      cell: (m) =>
        m.currentSubscription && typeof m.currentSubscription === 'object' && m.currentSubscription.endDate
          ? formatDate(m.currentSubscription.endDate)
          : '—',
    },
    {
      key: 'remaining',
      header: t('members.balance'),
      align: 'end',
      cell: (m) =>
        m.currentSubscription && typeof m.currentSubscription === 'object'
          ? formatCurrency(m.currentSubscription.remainingAmount, lng)
          : '—',
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('nav.members')}
        description={data ? t('members.count', { n: formatNumber(data.meta.total, lng) }) : undefined}
        actions={
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> {t('members.add')}
          </Button>
        }
      />

      {creating && (
        <AddMemberDialog
          branches={branches.map((b) => ({ id: b._id, name: lng === 'ar' ? b.nameAr : b.nameEn }))}
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            refetch();
            navigate(`/members/${id}`);
          }}
        />
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
          <Input
            className="ps-9"
            placeholder={t('members.searchPlaceholder')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select value={status} onChange={(e) => setFilter('status', e.target.value)} className="w-48">
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>
              {s ? t(`statusLabel.${s.toUpperCase()}`, { defaultValue: s.replaceAll('_', ' ') }) : t('status.allStatuses')}
            </option>
          ))}
        </Select>
        <Select value={branchId} onChange={(e) => setFilter('branchId', e.target.value)} className="w-44">
          <option value="">{t('status.allBranches')}</option>
          {branches.map((b) => (
            <option key={b._id} value={b._id}>
              {lng === 'ar' ? b.nameAr : b.nameEn}
            </option>
          ))}
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={data?.data}
        rowKey={(m) => m._id}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        onRetry={refetch}
        onRowClick={(m) => navigate(`/members/${m._id}`)}
        emptyLabel={t('members.noMatch')}
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

interface MemberForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  primaryBranchId: string;
  dailyCheckInLimit: number;
}

function AddMemberDialog({
  branches,
  onClose,
  onCreated,
}: {
  branches: Array<{ id: string; name: string }>;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, watch, setValue } = useForm<MemberForm>({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      primaryBranchId: branches[0]?.id ?? '',
      dailyCheckInLimit: 0,
    },
  });

  const submit = async (f: MemberForm) => {
    setBusy(true);
    try {
      const m = await unwrap<{ _id: string }>(
        api.post('/members', {
          firstName: f.firstName,
          lastName: f.lastName,
          email: f.email,
          phone: f.phone,
          password: f.password,
          primaryBranchId: f.primaryBranchId || undefined,
          dailyCheckInLimit: Number(f.dailyCheckInLimit) || 0,
        }),
      );
      toast.success(t('members.created'));
      onCreated(m._id);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('members.addTitle')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit(submit)} disabled={busy}>
            {busy && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t('common.create')}
          </Button>
        </>
      }
    >
      <form className="grid grid-cols-2 gap-3" onSubmit={handleSubmit(submit)}>
        <Field label={t('staff.firstName')}>
          <Input {...register('firstName', { required: true })} />
        </Field>
        <Field label={t('staff.lastName')}>
          <Input {...register('lastName', { required: true })} />
        </Field>
        <Field label={t('staff.email')}>
          <Input type="email" dir="ltr" {...register('email', { required: true })} />
        </Field>
        <Field label={t('staff.phone')}>
          <Input dir="ltr" {...register('phone', { required: true })} />
        </Field>
        <Field label={t('staff.tempPassword')}>
          <Input dir="ltr" {...register('password', { required: true, minLength: 8 })} />
        </Field>
        <Field label={t('members.branch')}>
          <Select value={watch('primaryBranchId')} onChange={(e) => setValue('primaryBranchId', e.target.value)}>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('members.dailyLimit')}>
          <Input type="number" min={0} max={50} {...register('dailyCheckInLimit')} />
        </Field>
      </form>
    </Dialog>
  );
}
