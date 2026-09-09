import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { Printer } from 'lucide-react';
import { PageHeader, Card, Select, Input } from '@/components/ui/primitives';
import { useReport, useDashboardSummary } from '@/lib/api/hooks';
import { cn, formatCurrency, formatNumber, formatDate } from '@/lib/utils';
import { ChartSkeleton } from '@/components/ui/skeleton';
import i18n from '@/i18n';

const ACCENT = 'hsl(16 90% 52%)';
const GRID = 'hsl(0 0% 30% / 0.3)';
const PIE_COLORS = ['#f2591f', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#64748b', '#ef4444'];
const TT = {
  background: 'hsl(0 0% 9%)',
  border: '1px solid hsl(0 0% 18%)',
  borderRadius: 8,
  fontSize: 12,
};

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {children}
    </Card>
  );
}

type Range = 'day' | 'week' | 'month' | 'custom';
type Gran = 'day' | 'week' | 'month';

function DateField({
  value,
  onChange,
  min,
  max,
}: {
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
}) {
  return (
    <Input
      type="date"
      className="w-40"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function ReportsPage() {
  const { t } = useTranslation();
  const lng = i18n.language;
  const [range, setRange] = useState<Range>('month');
  const [gran, setGran] = useState<Gran>('month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const custom = range === 'custom';
  const p = custom
    ? { granularity: gran, ...(from ? { from } : {}), ...(to ? { to } : {}) }
    : { granularity: range as Gran };

  const revenue = useReport<Array<{ period: string; revenue: number }>>('revenue-trend', p);
  const growth = useReport<Array<{ period: string; newMembers: number }>>('membership-growth', p);
  const status = useReport<Array<{ status: string; count: number }>>('subscription-status');
  const byMethod = useReport<Array<{ method: string; revenue: number }>>('revenue-by-method', p);
  const peak = useReport<Array<{ hour: number; visits: number }>>('peak-hours', p);
  const topPlans = useReport<Array<{ plan: string; count: number }>>('subscriptions-by-plan');
  const outstanding = useReport<
    Array<{ name: string; phone: string; planNameEn: string; remainingAmount: number }>
  >('outstanding-balances');
  const { data: summary } = useDashboardSummary();

  const sum = <T,>(rows: T[] | undefined, pick: (r: T) => number) =>
    (rows ?? []).reduce((a, r) => a + (pick(r) || 0), 0);
  const rangeRevenue = sum(revenue.data, (r) => r.revenue);
  const rangeNewMembers = sum(growth.data, (r) => r.newMembers);
  const rangeVisits = sum(peak.data, (r) => r.visits);
  const rangeOutstanding = sum(outstanding.data, (r) => r.remainingAmount);

  const kpis: Array<{ label: string; value: string; accent?: boolean }> = [
    { label: t('reports.rangeRevenue'), value: formatCurrency(rangeRevenue, lng), accent: true },
    { label: t('reports.rangeNewMembers'), value: formatNumber(rangeNewMembers, lng) },
    { label: t('reports.rangeVisits'), value: formatNumber(rangeVisits, lng) },
    { label: t('reports.rangeOutstanding'), value: formatCurrency(rangeOutstanding, lng) },
    {
      label: t('dashboard.kpi.activeMembers'),
      value: formatNumber((summary?.activeMembers as number) ?? 0, lng),
    },
    {
      label: t('dashboard.kpi.totalMembers'),
      value: formatNumber((summary?.totalMembers as number) ?? 0, lng),
    },
  ];

  return (
    <div id="report-print">
      <PageHeader
        title={t('reports.title')}
        actions={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Select
              className="w-32"
              value={range}
              onChange={(e) => {
                const v = e.target.value as Range;
                setRange(v);
                if (v !== 'custom') {
                  setFrom('');
                  setTo('');
                }
              }}
            >
              <option value="day">{t('reports.daily')}</option>
              <option value="week">{t('reports.weekly')}</option>
              <option value="month">{t('reports.monthly')}</option>
              <option value="custom">{t('reports.custom')}</option>
            </Select>

            {custom && (
              <>
                <DateField value={from} max={to || undefined} onChange={setFrom} />
                <span className="text-muted-foreground">—</span>
                <DateField value={to} min={from || undefined} onChange={setTo} />
                <div className="flex overflow-hidden rounded-lg border border-input">
                  {(['day', 'week', 'month'] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGran(g)}
                      className={cn(
                        'px-2.5 py-1.5 text-xs font-medium transition-colors',
                        gran === g
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:bg-muted',
                      )}
                    >
                      {t(`reports.${g === 'day' ? 'daily' : g === 'week' ? 'weekly' : 'monthly'}`)}
                    </button>
                  ))}
                </div>
              </>
            )}

            <button
              onClick={() => window.print()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              <Printer className="h-4 w-4" /> {t('reports.print')}
            </button>
          </div>
        }
      />

      {/* Print-only header band */}
      <div className="mb-6 hidden items-baseline justify-between border-b-2 border-black pb-2 print:flex">
        <span className="font-display text-xl font-bold uppercase">IRON GYM</span>
        <span className="text-sm">
          {t('reports.title')} ·{' '}
          {custom
            ? `${from || '…'} — ${to || '…'}`
            : t(`reports.${range === 'day' ? 'daily' : range === 'week' ? 'weekly' : 'monthly'}`)}{' '}
          · {formatDate(new Date())}
        </span>
      </div>

      {/* KPI summary band */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6 print:grid-cols-6 print:gap-2">
        {kpis.map((k) => (
          <Card key={k.label} className="p-3 print:border-black/40">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {k.label}
            </p>
            <p
              className={cn(
                'mt-1 font-display text-lg font-bold',
                k.accent && 'text-accent print:text-black',
              )}
            >
              {k.value}
            </p>
          </Card>
        ))}
      </div>

      {revenue.isLoading && growth.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <ChartSkeleton key={i} height={200} />
          ))}
        </div>
      ) : (
      <>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t('reports.revenueTrend')}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={revenue.data ?? []}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke={GRID} />
              <YAxis tick={{ fontSize: 11 }} stroke={GRID} width={52} />
              <Tooltip contentStyle={TT} />
              <Line type="monotone" dataKey="revenue" stroke={ACCENT} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title={t('reports.membershipGrowth')}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={growth.data ?? []}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke={GRID} />
              <YAxis tick={{ fontSize: 11 }} stroke={GRID} width={36} allowDecimals={false} />
              <Tooltip contentStyle={TT} cursor={{ fill: 'hsl(0 0% 100% / 0.04)' }} />
              <Bar dataKey="newMembers" fill={ACCENT} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title={t('reports.subscriptionStatus')}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={status.data ?? []}
                dataKey="count"
                nameKey="status"
                innerRadius={45}
                outerRadius={80}
              >
                {(status.data ?? []).map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={TT} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {(status.data ?? []).map((s, i) => (
              <span key={s.status}>
                <span
                  className="mr-1 inline-block h-2 w-2 rounded-full"
                  style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                />
                {t(`statusLabel.${s.status}`, {
                  defaultValue: s.status.replaceAll('_', ' ').toLowerCase(),
                })}{' '}
                · {s.count}
              </span>
            ))}
          </div>
        </Panel>

        <Panel title={t('reports.revenueByMethod')}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byMethod.data ?? []} layout="vertical">
              <CartesianGrid stroke={GRID} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke={GRID} />
              <YAxis type="category" dataKey="method" tick={{ fontSize: 11 }} stroke={GRID} width={90} />
              <Tooltip contentStyle={TT} cursor={{ fill: 'hsl(0 0% 100% / 0.04)' }} />
              <Bar dataKey="revenue" fill={ACCENT} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title={t('reports.peakHours')}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={peak.data ?? []}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 11 }} stroke={GRID} />
              <YAxis tick={{ fontSize: 11 }} stroke={GRID} width={36} allowDecimals={false} />
              <Tooltip contentStyle={TT} cursor={{ fill: 'hsl(0 0% 100% / 0.04)' }} />
              <Bar dataKey="visits" fill={ACCENT} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title={t('reports.subsByPlan')}>
          <ul className="space-y-2 text-sm">
            {(topPlans.data ?? []).map((row) => (
              <li key={row.plan} className="flex items-center justify-between">
                <span>{row.plan}</span>
                <span className="font-display font-bold">{row.count}</span>
              </li>
            ))}
            {(topPlans.data ?? []).length === 0 && (
              <li className="text-muted-foreground">{t('reports.noData')}</li>
            )}
          </ul>
        </Panel>
      </div>

      <Panel title={t('reports.outstandingBalances')}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2 text-start">{t('reports.member')}</th>
                <th className="py-2 text-start">{t('reports.plan')}</th>
                <th className="py-2 text-end">{t('reports.balance')}</th>
              </tr>
            </thead>
            <tbody>
              {(outstanding.data ?? []).map((r, i) => (
                <tr key={i} className="border-t border-border/50">
                  <td className="py-2">
                    {r.name} <span className="text-muted-foreground" dir="ltr">· {r.phone}</span>
                  </td>
                  <td className="py-2">{r.planNameEn}</td>
                  <td className="py-2 text-end">{formatCurrency(r.remainingAmount, lng)}</td>
                </tr>
              ))}
              {(outstanding.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-muted-foreground">
                    {t('reports.noOutstanding')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
      </>
      )}
    </div>
  );
}
