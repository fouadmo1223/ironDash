import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil } from 'lucide-react';
import { PageHeader, Card } from '@/components/ui/primitives';
import { CardsSkeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { usePlans } from '@/lib/api/hooks';
import { formatCurrency } from '@/lib/utils';
import i18n from '@/i18n';

export function PlansPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const lng = i18n.language;
  const { data: plans = [], isLoading } = usePlans();

  return (
    <div>
      <PageHeader
        title={t('plans.title')}
        actions={
          <Button size="sm" onClick={() => navigate('/plans/new')}>
            <Plus className="h-4 w-4" /> {t('plans.new')}
          </Button>
        }
      />
      {isLoading && <CardsSkeleton count={6} lines={4} />}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((p) => (
          <Card
            key={p._id}
            className="group flex cursor-pointer flex-col p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-[0_10px_30px_-12px_hsl(var(--accent)/0.3)]"
            onClick={() => navigate(`/plans/${p._id}/edit`)}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-lg font-bold uppercase">
                  {lng === 'ar' ? p.nameAr : p.nameEn}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t('plans.daysSuffix', { count: p.durationDays })}
                </p>
              </div>
              {p.isFeatured && <StatusBadge value="FEATURED" kind="generic" label="featured" />}
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-accent">
              {formatCurrency(p.price, lng)}
            </p>
            <ul className="mt-3 flex-1 space-y-1 text-xs text-muted-foreground">
              {(lng === 'ar' ? p.featuresAr : p.featuresEn).slice(0, 4).map((f, i) => (
                <li key={i}>· {f}</li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between">
              <StatusBadge
                value={p.isActive ? 'ACTIVE' : 'ARCHIVED'}
                kind="generic"
                label={p.isActive ? 'active' : 'archived'}
              />
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors group-hover:text-accent">
                <Pencil className="h-3.5 w-3.5" /> {t('plans.edit')}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
