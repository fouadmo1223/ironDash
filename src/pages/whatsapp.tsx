import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Search, Filter, X } from 'lucide-react';
import { PageHeader, Card, Input, Select } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useMembers, useWhatsAppTemplates, usePlans, useBranches } from '@/lib/api/hooks';
import { api, unwrap } from '@/lib/api';
import { cn } from '@/lib/utils';
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

interface Generated {
  memberId: string;
  name: string;
  phone: string;
  message: string;
  waLink: string;
}

export function WhatsAppPage() {
  const { t } = useTranslation();
  const lng = i18n.language;
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [planId, setPlanId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [endFrom, setEndFrom] = useState('');
  const [endTo, setEndTo] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [templateKey, setTemplateKey] = useState('');
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [results, setResults] = useState<Generated[]>([]);
  const [generating, setGenerating] = useState(false);

  const { data: templates = [] } = useWhatsAppTemplates();
  const { data: plans = [] } = usePlans();
  const { data: branches = [] } = useBranches();
  const { data: members, isFetching: membersFetching } = useMembers(
    useMemo(
      () => ({
        search: search || undefined,
        status: status || undefined,
        planId: planId || undefined,
        branchId: branchId || undefined,
        endFrom: endFrom || undefined,
        endTo: endTo || undefined,
        limit: 60,
      }),
      [search, status, planId, branchId, endFrom, endTo],
    ),
  );

  const rows = members?.data ?? [];
  const anyFilter = status || planId || branchId || endFrom || endTo || search;
  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setPlanId('');
    setBranchId('');
    setEndFrom('');
    setEndTo('');
  };
  const selectAllShown = () =>
    setSelected(Object.fromEntries(rows.map((m) => [m._id, true])));

  const selectedIds = Object.keys(selected).filter((k) => selected[k]);

  const generate = async () => {
    if (!templateKey || selectedIds.length === 0) return;
    setGenerating(true);
    try {
      const res = await unwrap<Generated[]>(
        api.post('/whatsapp/generate', { memberIds: selectedIds, templateKey, language }),
      );
      setResults(res);
      toast.success(t('whatsapp.generated', { n: res.length }));
    } catch {
      toast.error(t('whatsapp.genFailed'));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <PageHeader title={t('whatsapp.title')} description={t('whatsapp.desc')} />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="p-4">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input
              className="ps-9"
              placeholder={t('whatsapp.searchMembers')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="mb-3 grid gap-2 rounded-lg border border-border/70 bg-surface-raised/40 p-3 sm:grid-cols-2">
            <div className="col-span-full flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Filter className="h-3.5 w-3.5" /> {t('whatsapp.filters')}
              {anyFilter && (
                <button
                  onClick={clearFilters}
                  className="ms-auto inline-flex items-center gap-1 text-[11px] font-medium normal-case text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" /> {t('reports.clearRange')}
                </button>
              )}
            </div>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>
                  {s
                    ? t(`statusLabel.${s.toUpperCase()}`, { defaultValue: s.replaceAll('_', ' ') })
                    : t('status.allStatuses')}
                </option>
              ))}
            </Select>
            <Select value={planId} onChange={(e) => setPlanId(e.target.value)}>
              <option value="">{t('whatsapp.allPlans')}</option>
              {plans.map((p) => (
                <option key={p._id} value={p._id}>
                  {lng === 'ar' ? p.nameAr : p.nameEn}
                </option>
              ))}
            </Select>
            <Select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">{t('status.allBranches')}</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {lng === 'ar' ? b.nameAr : b.nameEn}
                </option>
              ))}
            </Select>
            <div />
            <label className="text-[11px] font-medium text-muted-foreground">
              {t('whatsapp.endsBetween')}
              <Input type="date" className="mt-1" value={endFrom} max={endTo || undefined} onChange={(e) => setEndFrom(e.target.value)} />
            </label>
            <label className="text-[11px] font-medium text-muted-foreground">
              &nbsp;
              <Input type="date" className="mt-1" value={endTo} min={endFrom || undefined} onChange={(e) => setEndTo(e.target.value)} />
            </label>
          </div>

          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{t('members.count', { n: members?.meta.total ?? 0 })}</span>
            {rows.length > 0 && (
              <button onClick={selectAllShown} className="font-semibold text-accent hover:underline">
                {t('qrCards.selectAll')}
              </button>
            )}
          </div>

          <div className="max-h-[380px] space-y-1 overflow-y-auto">
            {membersFetching &&
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-2.5 w-44" />
                  </div>
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            {!membersFetching &&
              rows.map((m) => {
              const on = !!selected[m._id];
              const nm = `${m.user?.firstName ?? ''} ${m.user?.lastName ?? ''}`.trim();
              const cs =
                m.currentSubscription && typeof m.currentSubscription === 'object'
                  ? m.currentSubscription
                  : null;
              return (
                <label
                  key={m._id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors',
                    on
                      ? 'border-accent/50 bg-accent/10'
                      : 'border-transparent hover:border-border hover:bg-muted/40',
                  )}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0 accent-accent"
                    checked={on}
                    onChange={(e) => setSelected((s) => ({ ...s, [m._id]: e.target.checked }))}
                  />
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted font-display text-xs font-bold uppercase text-muted-foreground">
                    {(nm || '?').slice(0, 2)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{nm || '—'}</span>
                    <span className="block text-xs text-muted-foreground" dir="ltr">
                      {m.memberCode} · {m.user?.phone ?? '—'}
                    </span>
                  </span>
                  {cs ? (
                    <StatusBadge value={cs.status} kind="subscription" />
                  ) : (
                    <span className="shrink-0 text-[10px] font-semibold uppercase text-muted-foreground">
                      {t('status.noSubscription')}
                    </span>
                  )}
                </label>
              );
            })}
            {!membersFetching && rows.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t('members.noMatch')}
              </p>
            )}
          </div>
        </Card>

        <Card className="h-fit space-y-3 p-4">
          <p className="text-sm">
            <span className="font-display text-lg font-bold text-accent">{selectedIds.length}</span>{' '}
            {t('whatsapp.selected')}
          </p>
          <Select value={templateKey} onChange={(e) => setTemplateKey(e.target.value)}>
            <option value="">{t('whatsapp.chooseTemplate')}</option>
            {templates
              .filter((t) => t.isActive)
              .map((t) => (
                <option key={t.key} value={t.key}>
                  {lng === 'ar' ? t.nameAr : t.nameEn}
                </option>
              ))}
          </Select>
          <Select value={language} onChange={(e) => setLanguage(e.target.value as 'ar' | 'en')}>
            <option value="ar">{t('whatsapp.arMessage')}</option>
            <option value="en">{t('whatsapp.enMessage')}</option>
          </Select>
          <Button
            className="w-full"
            disabled={!templateKey || selectedIds.length === 0 || generating}
            onClick={generate}
          >
            {generating ? t('whatsapp.generating') : t('whatsapp.generate')}
          </Button>
        </Card>
      </div>

      {results.length > 0 && (
        <div className="mt-6 space-y-2">
          {results.map((r) => (
            <Card key={r.memberId} className="flex items-start gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {r.name} <span className="text-muted-foreground" dir="ltr">· {r.phone}</span>
                </p>
                <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{r.message}</p>
              </div>
              <a href={r.waLink} target="_blank" rel="noreferrer">
                <Button size="sm" variant="outline">
                  {t('whatsapp.open')} <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </a>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
