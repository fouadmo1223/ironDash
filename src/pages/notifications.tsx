import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Loader2, ChevronDown, Bell, Megaphone } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { PageHeader, Card, Input, Textarea, Select, Field } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { api, apiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import i18n from '@/i18n';

interface Notif {
  _id: string;
  type: string;
  titleEn: string;
  titleAr: string;
  messageEn: string;
  messageAr: string;
  isRead: boolean;
  createdAt: string;
}

/** Events that send a notification automatically. */
const TRIGGERS: Array<{ type: string; en: string; ar: string }> = [
  { type: 'SUBSCRIPTION_CREATED', en: 'A member starts a new subscription', ar: 'عند إنشاء العضو اشتراكًا جديدًا' },
  { type: 'SUBSCRIPTION_ACTIVATED', en: 'A payment is approved and the subscription activates', ar: 'عند اعتماد الدفعة وتفعيل الاشتراك' },
  { type: 'SUBSCRIPTION_EXPIRING', en: 'A subscription is close to its end date (reminder job)', ar: 'عند اقتراب انتهاء الاشتراك (مهمة مجدولة)' },
  { type: 'SUBSCRIPTION_EXPIRED', en: 'A subscription passes its end date', ar: 'عند تجاوز الاشتراك تاريخ انتهائه' },
  { type: 'PAYMENT_SUBMITTED', en: 'A member uploads a manual payment proof', ar: 'عند رفع العضو إثبات دفع يدوي' },
  { type: 'PAYMENT_APPROVED', en: 'Staff approve a payment', ar: 'عند اعتماد الموظف للدفعة' },
  { type: 'PAYMENT_REJECTED', en: 'Staff reject a payment', ar: 'عند رفض الموظف للدفعة' },
  { type: 'PAYMENT_REFUNDED', en: 'A payment is refunded', ar: 'عند استرداد دفعة' },
  { type: 'QR_ISSUED', en: 'An access QR is issued for a member', ar: 'عند إصدار رمز دخول للعضو' },
  { type: 'ANNOUNCEMENT / PROMOTION / SYSTEM', en: 'Sent manually from this page', ar: 'تُرسَل يدويًا من هذه الصفحة' },
];

export function NotificationsPage() {
  const { t } = useTranslation();
  const lng = i18n.language;
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRef, setShowRef] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get('/notifications', { params: { limit: 50 } })
      .then((r) => setItems(r.data.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const markAll = async () => {
    await api.patch('/notifications/read-all');
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('notifications.title')}
        description={t('notifications.desc')}
        actions={
          <Button size="sm" variant="outline" onClick={markAll}>
            {t('notifications.markAllRead')}
          </Button>
        }
      />

      <Composer onSent={load} />

      {/* Automatic-notification reference */}
      <Card className="overflow-hidden">
        <button
          type="button"
          onClick={() => setShowRef((v) => !v)}
          className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold"
        >
          <Bell className="h-4 w-4 text-accent" />
          {t('notifications.triggersTitle')}
          <ChevronDown
            className={cn('ms-auto h-4 w-4 transition-transform', showRef && 'rotate-180')}
          />
        </button>
        {showRef && (
          <div className="border-t border-border">
            {TRIGGERS.map((tr) => (
              <div
                key={tr.type}
                className="flex flex-col gap-0.5 border-b border-border/60 px-4 py-2.5 last:border-0 sm:flex-row sm:items-center sm:gap-4"
              >
                <code className="shrink-0 text-xs font-semibold text-accent sm:w-56">{tr.type}</code>
                <span className="text-sm text-muted-foreground">{lng === 'ar' ? tr.ar : tr.en}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Received notifications */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('notifications.recent')}
        </h3>
        {loading && <p className="text-sm text-muted-foreground">{t('common.loading')}</p>}
        <div className="space-y-2">
          {items.map((n) => (
            <Card key={n._id} className={cn('p-3', n.isRead && 'opacity-60')}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{lng === 'ar' ? n.titleAr : n.titleEn}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {lng === 'ar' ? n.messageAr : n.messageEn}
                  </p>
                </div>
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  {formatDateTime(n.createdAt)}
                </span>
              </div>
            </Card>
          ))}
          {!loading && items.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('notifications.empty')}</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface PickedMember {
  id: string;
  name: string;
}

function Composer({ onSent }: { onSent: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [type, setType] = useState('ANNOUNCEMENT');
  const [audience, setAudience] = useState('members');
  const [f, setF] = useState({ titleEn: '', titleAr: '', messageEn: '', messageAr: '' });
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<PickedMember[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [picked, setPicked] = useState<PickedMember[]>([]);
  const q = search.trim();
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));
  const ready =
    f.titleEn.trim() &&
    f.titleAr.trim() &&
    f.messageEn.trim() &&
    f.messageAr.trim() &&
    (audience !== 'custom' || picked.length > 0);

  useEffect(() => {
    if (audience !== 'custom' || q.length < 2) {
      setResults([]);
      setSearching(false);
      setSearched(false);
      return;
    }
    let alive = true;
    setSearching(true);
    setSearched(false);
    const id = window.setTimeout(async () => {
      try {
        const r = await api.get('/members', { params: { search: q, limit: 8 } });
        const rows = (r.data?.data?.data ?? r.data?.data ?? []) as Array<{
          _id: string;
          user?: { _id: string; firstName?: string; lastName?: string };
          memberCode?: string;
        }>;
        if (!alive) return;
        setResults(
          rows
            .filter((m) => m.user?._id)
            .map((m) => ({
              id: m.user!._id,
              name: `${m.user?.firstName ?? ''} ${m.user?.lastName ?? ''}`.trim() || m.memberCode || m.user!._id,
            })),
        );
      } catch {
        if (alive) setResults([]);
      } finally {
        if (alive) {
          setSearching(false);
          setSearched(true);
        }
      }
    }, 300);
    return () => {
      alive = false;
      window.clearTimeout(id);
    };
  }, [q, audience]);

  const send = async () => {
    setBusy(true);
    try {
      const body: Record<string, unknown> = { type, audience, ...f };
      if (audience === 'custom') body.userIds = picked.map((p) => p.id);
      const { data } = await api.post('/notifications/broadcast', body);
      const n = data?.data?.sent ?? 0;
      toast.success(t('notifications.sent', { n }));
      setF({ titleEn: '', titleAr: '', messageEn: '', messageAr: '' });
      setPicked([]);
      setSearch('');
      onSent();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="space-y-3 p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Megaphone className="h-4 w-4 text-accent" />
        {t('notifications.composeTitle')}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('notifications.type')}>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="ANNOUNCEMENT">{t('notifications.typeAnnouncement')}</option>
            <option value="PROMOTION">{t('notifications.typePromotion')}</option>
            <option value="SYSTEM">{t('notifications.typeSystem')}</option>
          </Select>
        </Field>
        <Field label={t('notifications.audience')}>
          <Select value={audience} onChange={(e) => setAudience(e.target.value)}>
            <option value="members">{t('notifications.audMembers')}</option>
            <option value="staff">{t('notifications.audStaff')}</option>
            <option value="all">{t('notifications.audAll')}</option>
            <option value="custom">{t('notifications.audCustom')}</option>
          </Select>
        </Field>
        {audience === 'custom' && (
          <div className="sm:col-span-2">
            <Field label={t('notifications.pickMembers')}>
              <div className="relative">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('notifications.searchMembers')}
                />
                {q.length >= 1 && q.length < 2 && (
                  <p className="mt-1 text-xs text-muted-foreground">{t('notifications.searchHint')}</p>
                )}
                {q.length >= 2 && (
                  <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border border-border bg-surface shadow-lg">
                    {searching &&
                      [0, 1, 2].map((i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-2">
                          <span className="h-3.5 w-3.5 shrink-0 animate-pulse rounded-full bg-muted" />
                          <span
                            className="h-3.5 animate-pulse rounded bg-muted"
                            style={{ width: `${60 - i * 12}%` }}
                          />
                        </div>
                      ))}
                    {!searching &&
                      results.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            if (!picked.some((p) => p.id === m.id)) setPicked((p) => [...p, m]);
                            setSearch('');
                            setResults([]);
                            setSearched(false);
                          }}
                          className="block w-full px-3 py-2 text-start text-sm hover:bg-muted"
                        >
                          {m.name}
                        </button>
                      ))}
                    {!searching && searched && results.length === 0 && (
                      <p className="px-3 py-2.5 text-sm text-muted-foreground">
                        {t('notifications.noMembers', { q })}
                      </p>
                    )}
                  </div>
                )}
              </div>
              {picked.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {picked.map((m) => (
                    <span
                      key={m.id}
                      className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent"
                    >
                      {m.name}
                      <button
                        type="button"
                        onClick={() => setPicked((p) => p.filter((x) => x.id !== m.id))}
                        className="hover:text-danger"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </Field>
          </div>
        )}
        <Field label={t('notifications.titleEn')}>
          <Input dir="ltr" value={f.titleEn} onChange={(e) => set('titleEn', e.target.value)} />
        </Field>
        <Field label={t('notifications.titleAr')}>
          <Input dir="rtl" value={f.titleAr} onChange={(e) => set('titleAr', e.target.value)} />
        </Field>
        <Field label={t('notifications.messageEn')}>
          <Textarea dir="ltr" value={f.messageEn} onChange={(e) => set('messageEn', e.target.value)} />
        </Field>
        <Field label={t('notifications.messageAr')}>
          <Textarea dir="rtl" value={f.messageAr} onChange={(e) => set('messageAr', e.target.value)} />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button onClick={send} disabled={!ready || busy}>
          {busy ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Send className="me-2 h-4 w-4" />}
          {t('notifications.send')}
        </Button>
      </div>
    </Card>
  );
}
