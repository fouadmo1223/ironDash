import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { PageHeader, Field, Input, Select } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { DataTable, Pagination, type Column } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { useBranches, useRoles, useStaff, useApiMutation } from '@/lib/api/hooks';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import type { StaffRow } from '@/lib/api/types';
import i18n from '@/i18n';

type Opt = { id: string; name: string };

export function StaffPage() {
  const { t } = useTranslation();
  const lng = i18n.language;
  const toast = useToast();
  const { can } = useAuth();
  const canManage = can('staff.manage');
  const [page, setPage] = useState(1);
  const params = useMemo(() => ({ page, limit: 20 }), [page]);
  const { data, isLoading, isError, refetch } = useStaff(params);
  const { data: roles = [] } = useRoles();
  const { data: branches = [] } = useBranches();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<StaffRow | null>(null);

  const roleOpts: Opt[] = roles.map((r) => ({ id: r._id, name: lng === 'ar' ? r.nameAr ?? r.nameEn : r.nameEn }));
  const branchOpts: Opt[] = branches.map((b) => ({ id: b._id, name: lng === 'ar' ? b.nameAr : b.nameEn }));

  const cols: Column<StaffRow>[] = [
    {
      key: 'name',
      header: t('staff.name'),
      cell: (s) => (
        <div>
          <div className="font-medium">
            {s.user?.firstName} {s.user?.lastName}
          </div>
          <div className="text-xs text-muted-foreground">{s.user?.email}</div>
        </div>
      ),
    },
    { key: 'role', header: t('staff.role'), cell: (s) => (lng === 'ar' ? s.role?.nameAr ?? s.role?.nameEn : s.role?.nameEn) ?? '—' },
    { key: 'branch', header: t('staff.branch'), cell: (s) => (lng === 'ar' ? s.branch?.nameAr ?? s.branch?.nameEn : s.branch?.nameEn) ?? '—' },
    { key: 'title', header: t('staff.jobTitle'), cell: (s) => (lng === 'ar' ? s.jobTitleAr || s.jobTitleEn : s.jobTitleEn) || '—' },
    {
      key: 'status',
      header: '',
      cell: (s) => (
        <StatusBadge
          value={s.isActive ? 'ACTIVE' : 'OFF'}
          label={s.isActive ? 'active' : 'disabled'}
          kind="generic"
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('staff.title')}
        description={canManage ? t('staff.editHint') : undefined}
        actions={canManage ? <Button size="sm" onClick={() => setCreating(true)}>{t('staff.add')}</Button> : undefined}
      />
      <DataTable
        columns={cols}
        rows={data?.data}
        rowKey={(s) => s._id}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        onRowClick={canManage ? (s) => setEditing(s) : undefined}
      />
      {data && (
        <Pagination page={data.meta.page} pages={data.meta.pages} total={data.meta.total} onPage={setPage} />
      )}
      {creating && (
        <StaffCreateDialog
          roles={roleOpts}
          branches={branchOpts}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            toast.success(t('staff.created'));
            void refetch();
          }}
        />
      )}
      {editing && (
        <StaffEditDialog
          staff={editing}
          roles={roleOpts}
          branches={branchOpts}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            toast.success(t('staff.updated'));
            void refetch();
          }}
        />
      )}
    </div>
  );
}

function StaffCreateDialog({
  roles,
  branches,
  onClose,
  onSaved,
}: {
  roles: Opt[];
  branches: Opt[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      roleId: roles[0]?.id ?? '',
      branchId: branches[0]?.id ?? '',
      jobTitleEn: '',
      jobTitleAr: '',
    },
  });
  const save = useApiMutation(
    (body: Record<string, unknown>) => api.post('/staff', body),
    [],
    { onSuccess: onSaved },
  );

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('staff.addTitle')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit((f) => save.mutate(f))} disabled={save.isPending}>
            {t('common.create')}
          </Button>
        </>
      }
    >
      <form className="grid grid-cols-2 gap-3" onSubmit={handleSubmit((f) => save.mutate(f))}>
        <Field label={t('staff.firstName')}>
          <Input {...register('firstName', { required: true })} />
        </Field>
        <Field label={t('staff.lastName')}>
          <Input {...register('lastName', { required: true })} />
        </Field>
        <Field label={t('staff.email')}>
          <Input type="email" {...register('email', { required: true })} />
        </Field>
        <Field label={t('staff.phone')}>
          <Input dir="ltr" {...register('phone', { required: true })} />
        </Field>
        <Field label={t('staff.tempPassword')}>
          <Input {...register('password', { required: true, minLength: 8 })} />
        </Field>
        <div />
        <Field label={t('staff.jobTitleEn')}>
          <Input dir="ltr" {...register('jobTitleEn')} />
        </Field>
        <Field label={t('staff.jobTitleAr')}>
          <Input dir="rtl" {...register('jobTitleAr')} />
        </Field>
        <Field label={t('staff.role')}>
          <Select value={watch('roleId')} onChange={(e) => setValue('roleId', e.target.value)}>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('staff.branch')}>
          <Select value={watch('branchId')} onChange={(e) => setValue('branchId', e.target.value)}>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
      </form>
    </Dialog>
  );
}

function StaffEditDialog({
  staff,
  roles,
  branches,
  onClose,
  onSaved,
}: {
  staff: StaffRow;
  roles: Opt[];
  branches: Opt[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      roleId: staff.role?._id ?? '',
      branchId: staff.branch?._id ?? '',
      jobTitleEn: staff.jobTitleEn ?? '',
      jobTitleAr: staff.jobTitleAr ?? '',
      isActive: staff.isActive ? 'true' : 'false',
    },
  });
  const save = useApiMutation(
    (body: Record<string, unknown>) => api.patch(`/staff/${staff._id}`, body),
    [],
    { onSuccess: onSaved },
  );

  const submit = handleSubmit((f) =>
    save.mutate({
      roleId: f.roleId,
      branchId: f.branchId || null,
      jobTitleEn: f.jobTitleEn,
      jobTitleAr: f.jobTitleAr,
      isActive: f.isActive === 'true',
    }),
  );

  return (
    <Dialog
      open
      onClose={onClose}
      title={`${t('staff.editTitle')} — ${staff.user?.firstName} ${staff.user?.lastName}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={save.isPending}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form className="grid grid-cols-2 gap-3" onSubmit={submit}>
        <Field label={t('staff.role')}>
          <Select value={watch('roleId')} onChange={(e) => setValue('roleId', e.target.value)}>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('staff.branch')}>
          <Select value={watch('branchId')} onChange={(e) => setValue('branchId', e.target.value)}>
            <option value="">—</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('staff.jobTitleEn')}>
          <Input dir="ltr" {...register('jobTitleEn')} />
        </Field>
        <Field label={t('staff.jobTitleAr')}>
          <Input dir="rtl" {...register('jobTitleAr')} />
        </Field>
        <Field label={t('staff.active')}>
          <Select value={watch('isActive')} onChange={(e) => setValue('isActive', e.target.value)}>
            <option value="true">{t('common.yes')}</option>
            <option value="false">{t('common.no')}</option>
          </Select>
        </Field>
      </form>
    </Dialog>
  );
}
