import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { PageHeader, Card, Field, Input, Textarea, Select } from '@/components/ui/primitives';
import { FormSkeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { api, unwrap } from '@/lib/api';

interface PaymentMethod {
  _id: string;
  nameEn: string;
  nameAr: string;
  type: string;
  accountName: string;
  accountNumber: string;
  phoneNumber: string;
  iban: string;
  bankNameEn: string;
  instructionsEn: string;
  instructionsAr: string;
  isActive: boolean;
  displayOrder: number;
}

const TYPES = ['INSTAPAY', 'VODAFONE_CASH', 'MOBILE_WALLET', 'BANK_TRANSFER', 'OTHER'];

const empty: Omit<PaymentMethod, '_id'> = {
  nameEn: '',
  nameAr: '',
  type: 'INSTAPAY',
  accountName: '',
  accountNumber: '',
  phoneNumber: '',
  iban: '',
  bankNameEn: '',
  instructionsEn: '',
  instructionsAr: '',
  isActive: true,
  displayOrder: 0,
};

export function PaymentMethodEditPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = !id;

  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    if (isNew) return;
    unwrap<PaymentMethod[]>(api.get('/payment-methods'))
      .then((list) => setMethod(list.find((m) => m._id === id) ?? null))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  if (loading) {
    return (
      <FormSkeleton fields={8} />
    );
  }
  if (!isNew && !method) return <p className="text-danger">{t('common.noRecords')}</p>;

  return (
    <Form
      key={method?._id ?? 'new'}
      defaults={method ?? empty}
      methodId={method?._id}
      title={isNew ? t('settings.newTitle') : t('settings.editTitle')}
      onDone={() => {
        toast.success(t('settings.saved'));
        navigate('/settings');
      }}
      onCancel={() => navigate('/settings')}
    />
  );
}

function Form({
  defaults,
  methodId,
  title,
  onDone,
  onCancel,
}: {
  defaults: Omit<PaymentMethod, '_id'>;
  methodId?: string;
  title: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const { register, handleSubmit, watch, setValue } = useForm({ defaultValues: defaults });
  const [saving, setSaving] = useState(false);

  const submit = async (f: unknown) => {
    setSaving(true);
    try {
      if (methodId) await api.patch(`/payment-methods/${methodId}`, f);
      else await api.post('/payment-methods', f);
      onDone();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <button
        onClick={onCancel}
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t('settings.paymentMethods')}
      </button>
      <PageHeader title={title} />

      <form onSubmit={handleSubmit(submit)} className="space-y-6">
        <Card className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('settings.nameEn')}>
              <Input dir="ltr" {...register('nameEn', { required: true })} />
            </Field>
            <Field label={t('settings.nameAr')}>
              <Input dir="rtl" {...register('nameAr', { required: true })} />
            </Field>
            <Field label={t('settings.type')}>
              <Select value={watch('type')} onChange={(e) => setValue('type', e.target.value)}>
                {TYPES.map((ty) => (
                  <option key={ty} value={ty}>
                    {ty.replaceAll('_', ' ')}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('settings.accountName')}>
              <Input {...register('accountName')} />
            </Field>
            <Field label={t('settings.accountNumber')}>
              <Input dir="ltr" {...register('accountNumber')} />
            </Field>
            <Field label={t('settings.phoneWallet')}>
              <Input dir="ltr" {...register('phoneNumber')} />
            </Field>
            <Field label={t('settings.iban')}>
              <Input dir="ltr" {...register('iban')} />
            </Field>
            <Field label={t('settings.bankNameEn')}>
              <Input {...register('bankNameEn')} />
            </Field>
          </div>
        </Card>

        <Card className="space-y-4 p-5">
          <Field label={t('settings.instructionsEn')}>
            <Textarea dir="ltr" rows={4} {...register('instructionsEn')} />
          </Field>
          <Field label={t('settings.instructionsAr')}>
            <Textarea dir="rtl" rows={4} {...register('instructionsAr')} />
          </Field>
        </Card>

        <Card className="p-5 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4 accent-accent" {...register('isActive')} />
            {t('settings.active')}
          </label>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t('common.save')}
          </Button>
        </div>
      </form>
    </div>
  );
}
