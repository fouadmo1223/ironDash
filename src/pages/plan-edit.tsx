import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { PageHeader, Card, Field, Input, Textarea } from '@/components/ui/primitives';
import { FormSkeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { usePlans, useApiMutation, qk } from '@/lib/api/hooks';
import { api } from '@/lib/api';
import type { PlanRow } from '@/lib/api/types';

interface PlanForm {
  nameEn: string;
  nameAr: string;
  price: number;
  durationDays: number;
  allowedVisits: number;
  freezeDays: number;
  featuresEn: string;
  featuresAr: string;
  isFeatured: boolean;
  isActive: boolean;
}

const emptyPlan: PlanForm = {
  nameEn: '',
  nameAr: '',
  price: 0,
  durationDays: 30,
  allowedVisits: 0,
  freezeDays: 0,
  featuresEn: '',
  featuresAr: '',
  isFeatured: false,
  isActive: true,
};

const toForm = (p: PlanRow): PlanForm => ({
  nameEn: p.nameEn,
  nameAr: p.nameAr,
  price: p.price,
  durationDays: p.durationDays,
  allowedVisits: p.allowedVisits,
  freezeDays: p.freezeDays,
  featuresEn: p.featuresEn.join('\n'),
  featuresAr: p.featuresAr.join('\n'),
  isFeatured: p.isFeatured,
  isActive: p.isActive,
});

export function PlanEditPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = !id;

  const { data: plans = [], isLoading } = usePlans();
  const plan = id ? plans.find((p) => p._id === id) : null;

  if (!isNew && isLoading) {
    return (
      <FormSkeleton fields={6} />
    );
  }
  if (!isNew && !plan) {
    return <p className="text-danger">{t('common.noRecords')}</p>;
  }

  return (
    <Form
      key={plan?._id ?? 'new'}
      defaults={plan ? toForm(plan) : emptyPlan}
      planId={plan?._id}
      onDone={() => {
        toast.success(t('plans.saved'));
        navigate('/plans');
      }}
      onCancel={() => navigate('/plans')}
      title={isNew ? t('plans.newTitle') : t('plans.editTitle')}
    />
  );
}

function Form({
  defaults,
  planId,
  onDone,
  onCancel,
  title,
}: {
  defaults: PlanForm;
  planId?: string;
  onDone: () => void;
  onCancel: () => void;
  title: string;
}) {
  const { t } = useTranslation();
  const { register, handleSubmit } = useForm<PlanForm>({ defaultValues: defaults });

  const save = useApiMutation(
    (body: Record<string, unknown>) =>
      planId
        ? api.patch(`/subscription-plans/${planId}`, body)
        : api.post('/subscription-plans', body),
    [qk.plans],
    { onSuccess: onDone },
  );

  const onSubmit = (f: PlanForm) =>
    save.mutate({
      nameEn: f.nameEn,
      nameAr: f.nameAr,
      price: Number(f.price),
      durationDays: Number(f.durationDays),
      allowedVisits: Number(f.allowedVisits),
      freezeDays: Number(f.freezeDays),
      featuresEn: f.featuresEn.split('\n').map((s) => s.trim()).filter(Boolean),
      featuresAr: f.featuresAr.split('\n').map((s) => s.trim()).filter(Boolean),
      isFeatured: !!f.isFeatured,
      isActive: !!f.isActive,
    });

  return (
    <div className="mx-auto max-w-3xl">
      <button
        onClick={onCancel}
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t('plans.title')}
      </button>
      <PageHeader title={title} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('plans.nameEn')}>
              <Input dir="ltr" {...register('nameEn', { required: true })} />
            </Field>
            <Field label={t('plans.nameAr')}>
              <Input dir="rtl" {...register('nameAr', { required: true })} />
            </Field>
            <Field label={t('plans.priceEgp')}>
              <Input type="number" dir="ltr" {...register('price')} />
            </Field>
            <Field label={t('plans.durationDays')}>
              <Input type="number" dir="ltr" {...register('durationDays')} />
            </Field>
            <Field label={t('plans.allowedVisits')}>
              <Input type="number" dir="ltr" {...register('allowedVisits')} />
            </Field>
            <Field label={t('plans.freezeDays')}>
              <Input type="number" dir="ltr" {...register('freezeDays')} />
            </Field>
          </div>
        </Card>

        <Card className="space-y-4 p-5">
          <Field label={t('plans.featuresEn')}>
            <Textarea dir="ltr" rows={5} {...register('featuresEn')} />
          </Field>
          <Field label={t('plans.featuresAr')}>
            <Textarea dir="rtl" rows={5} {...register('featuresAr')} />
          </Field>
        </Card>

        <Card className="flex flex-wrap gap-6 p-5 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4 accent-accent" {...register('isFeatured')} />
            {t('plans.featured')}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4 accent-accent" {...register('isActive')} />
            {t('plans.active')}
          </label>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t('common.save')}
          </Button>
        </div>
      </form>
    </div>
  );
}
