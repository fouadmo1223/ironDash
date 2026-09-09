import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowUpRight } from 'lucide-react';
import { Card, PageHeader } from '@/components/ui/primitives';
import { Stagger } from '@/components/ui/motion';
import { KpiSkeleton, ChartSkeleton } from '@/components/ui/skeleton';
import { useActionCenter, useDashboardSummary, useReport } from '@/lib/api/hooks';
import { formatCurrency, formatNumber } from '@/lib/utils';
import i18n from '@/i18n';

const CHART_COLOR = 'hsl(16 90% 52%)';
const GRID_COLOR = 'hsl(0 0% 30% / 0.3)';

export function DashboardHomePage() {
  const { t } = useTranslation();
  const lng = i18n.language;
  const { data: summary, isError } = useDashboardSummary();
  const { data: actions = [] } = useActionCenter();
  const { data: revenue = [] } = useReport<Array<{ period: string; revenue: number }>>(
    'revenue-trend',
    { granularity: 'month' },
  );
  const { data: growth = [] } = useReport<Array<{ period: string; newMembers: number }>>(
    'membership-growth',
    { granularity: 'month' },
  );

  const s = summary ?? {};
  const cards: Array<{ key: string; value: string; accent?: boolean }> = [
    { key: 'totalMembers', value: formatNumber(s.totalMembers ?? 0, lng) },
    { key: 'activeMembers', value: formatNumber(s.activeMembers ?? 0, lng) },
    { key: 'expiringSoon', value: formatNumber(s.expiringSoon ?? 0, lng) },
    { key: 'paymentsUnderReview', value: formatNumber(s.paymentsUnderReview ?? 0, lng), accent: true },
    { key: 'todayCheckins', value: formatNumber(s.todayCheckins ?? 0, lng) },
    { key: 'newThisMonth', value: formatNumber(s.newMembersThisMonth ?? 0, lng) },
    { key: 'monthlyRevenue', value: formatCurrency(s.monthlyRevenue ?? 0, lng) },
    { key: 'outstanding', value: formatCurrency(s.outstandingBalance ?? 0, lng) },
  ];

  const showSkeleton = !summary && !isError;

  return (
    <div>
      <PageHeader title={t('dashboard.title')} />

      {isError && (
        <p className="mb-4 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
          {t('common.error')} — {t('dashboard.apiUnreachable')}
        </p>
      )}

      {showSkeleton ? (
        <>
          <KpiSkeleton count={8} />
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <ChartSkeleton height={200} />
            <ChartSkeleton height={200} />
          </div>
        </>
      ) : (
      <>
      <Stagger className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Card
            key={c.key}
            className="group relative h-full overflow-hidden p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-[0_10px_30px_-12px_hsl(var(--accent)/0.35)]"
          >
            <span
              className={`absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-accent transition-transform duration-300 group-hover:scale-x-100 ${
                c.accent ? 'scale-x-100' : ''
              }`}
            />
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t(`dashboard.kpi.${c.key}`)}
            </p>
            <p className={`mt-2 font-display text-2xl font-bold ${c.accent ? 'text-accent' : ''}`}>
              {c.value}
            </p>
          </Card>
        ))}
      </Stagger>

      {actions.length > 0 && (
        <Card className="mt-6 p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t('dashboard.actionCenter')}
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {actions.map((a) => (
              <Link
                key={a.key}
                to={a.href}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2.5 text-sm transition-colors hover:border-accent hover:bg-muted/40"
              >
                <span>
                  <span className="font-display text-lg font-bold text-accent">{a.count}</span>{' '}
                  {t(`dashboard.kpi.${a.key}`, a.key)}
                </span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </Card>
      )}

      <Stagger className="mt-6 grid gap-4 lg:grid-cols-2" amount={0.1}>
        <Card className="p-4 transition-colors hover:border-accent/40">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t('dashboard.revenueTrend')}
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={revenue}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLOR} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={CHART_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID_COLOR} vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke={GRID_COLOR} />
              <YAxis tick={{ fontSize: 11 }} stroke={GRID_COLOR} width={48} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(0 0% 9%)',
                  border: '1px solid hsl(0 0% 18%)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke={CHART_COLOR}
                strokeWidth={2}
                fill="url(#rev)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4 transition-colors hover:border-accent/40">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t('dashboard.membershipGrowth')}
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={growth}>
              <CartesianGrid stroke={GRID_COLOR} vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke={GRID_COLOR} />
              <YAxis tick={{ fontSize: 11 }} stroke={GRID_COLOR} width={40} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(0 0% 9%)',
                  border: '1px solid hsl(0 0% 18%)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                cursor={{ fill: 'hsl(0 0% 100% / 0.04)' }}
              />
              <Bar dataKey="newMembers" fill={CHART_COLOR} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Stagger>
      </>
      )}
    </div>
  );
}
