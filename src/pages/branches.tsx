import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { PageHeader, Field, Input } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { useBranches, useApiMutation, qk } from '@/lib/api/hooks';
import { api } from '@/lib/api';
import type { BranchRow } from '@/lib/api/types';
import i18n from '@/i18n';

export function BranchesPage() {
  const { t } = useTranslation();
  const lng = i18n.language;
  const toast = useToast();
  const { data = [], isLoading, isError, refetch } = useBranches();
  const [editing, setEditing] = useState<BranchRow | 'new' | null>(null);

  const cols: Column<BranchRow>[] = [
    { key: 'code', header: t('branches.code'), cell: (b) => b.code },
    { key: 'name', header: t('branches.name'), cell: (b) => (lng === 'ar' ? b.nameAr : b.nameEn) },
    { key: 'city', header: t('branches.city'), cell: (b) => b.cityEn || '—' },
    { key: 'phone', header: t('branches.phone'), cell: (b) => <span dir="ltr">{b.phone || '—'}</span> },
    {
      key: 'status',
      header: '',
      cell: (b) => (
        <div className="flex gap-1">
          {b.isPrimary && <StatusBadge value="PRIMARY" label="primary" kind="generic" />}
          <StatusBadge
            value={b.isActive ? 'ACTIVE' : 'OFF'}
            label={b.isActive ? 'active' : 'inactive'}
            kind="generic"
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title={t('branches.title')} actions={<Button size="sm" onClick={() => setEditing('new')}>{t('branches.new')}</Button>} />
      <DataTable
        columns={cols}
        rows={data}
        rowKey={(b) => b._id}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        onRowClick={(b) => setEditing(b)}
      />
      {editing && (
        <BranchDialog
          branch={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            toast.success(t('branches.saved'));
          }}
        />
      )}
    </div>
  );
}

function BranchDialog({
  branch,
  onClose,
  onSaved,
}: {
  branch: BranchRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const { register, handleSubmit } = useForm({
    defaultValues: branch ?? {
      code: '',
      nameEn: '',
      nameAr: '',
      cityEn: '',
      phone: '',
      isPrimary: false,
      isActive: true,
    },
  });
  const save = useApiMutation(
    (body: unknown) =>
      branch ? api.patch(`/branches/${branch._id}`, body) : api.post('/branches', body),
    [qk.branches],
    { onSuccess: onSaved },
  );

  return (
    <Dialog
      open
      onClose={onClose}
      title={branch ? t('branches.editTitle') : t('branches.newTitle')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit((f) => save.mutate(f))} disabled={save.isPending}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form
        className="grid grid-cols-2 gap-3"
        onSubmit={handleSubmit((f) => save.mutate(f))}
      >
        <Field label={t('branches.code')}>
          <Input {...register('code', { required: true })} />
        </Field>
        <Field label={t('branches.phone')}>
          <Input dir="ltr" {...register('phone')} />
        </Field>
        <Field label={t('branches.nameEn')}>
          <Input {...register('nameEn', { required: true })} />
        </Field>
        <Field label={t('branches.nameAr')}>
          <Input dir="rtl" {...register('nameAr', { required: true })} />
        </Field>
        <Field label={t('branches.cityEn')}>
          <Input {...register('cityEn')} />
        </Field>
        <div className="col-span-2 flex gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register('isPrimary')} /> {t('branches.primary')}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register('isActive')} /> {t('branches.active')}
          </label>
        </div>
      </form>
    </Dialog>
  );
}
