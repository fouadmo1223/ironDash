import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, CreditCard } from 'lucide-react';
import { PageHeader, Card } from '@/components/ui/primitives';
import { CardsSkeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { api, unwrap } from '@/lib/api';

interface PaymentMethod {
  _id: string;
  nameEn: string;
  nameAr: string;
  type: string;
  accountNumber: string;
  phoneNumber: string;
  iban: string;
  isActive: boolean;
}

export function SettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    unwrap<PaymentMethod[]>(api.get('/payment-methods'))
      .then(setMethods)
      .catch(() => setMethods([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title={t('settings.title')}
        description={t('settings.desc')}
        actions={
          <Button size="sm" onClick={() => navigate('/settings/payment-methods/new')}>
            <Plus className="h-4 w-4" /> {t('settings.addMethod')}
          </Button>
        }
      />

      {loading && <CardsSkeleton count={6} lines={2} />}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {methods.map((m) => (
          <Card
            key={m._id}
            onClick={() => navigate(`/settings/payment-methods/${m._id}/edit`)}
            className="group flex cursor-pointer flex-col gap-3 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-[0_10px_30px_-12px_hsl(var(--accent)/0.3)]"
          >
            <div className="flex items-start justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent/12 text-accent">
                <CreditCard className="h-4 w-4" />
              </span>
              <StatusBadge
                value={m.isActive ? 'ACTIVE' : 'OFF'}
                label={m.isActive ? 'active' : 'inactive'}
                kind="generic"
              />
            </div>
            <div>
              <p className="font-display text-lg font-bold uppercase">{m.nameEn}</p>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {m.type.replaceAll('_', ' ')}
              </p>
            </div>
            <p className="text-xs text-muted-foreground" dir="ltr">
              {m.accountNumber || m.phoneNumber || m.iban || '—'}
            </p>
            <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors group-hover:text-accent">
              <Pencil className="h-3.5 w-3.5" /> {t('settings.edit')}
            </span>
          </Card>
        ))}
        {!loading && methods.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('settings.empty')}</p>
        )}
      </div>
    </div>
  );
}
