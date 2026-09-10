import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Printer, Plus, Loader2, Search, Check } from 'lucide-react';
import { PageHeader, Card, Field, Input } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { useMembers } from '@/lib/api/hooks';
import { api, apiError, unwrap } from '@/lib/api';
import { cn } from '@/lib/utils';
import { printQrCards } from '@/lib/print-qr';
import { Skeleton } from '@/components/ui/skeleton';
import i18n from '@/i18n';

interface CardItem {
  id: string;
  cardCode: string;
  qrDataUrl: string;
  createdAt: string;
}

export function QrCardsPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const [count, setCount] = useState('1');
  const [generating, setGenerating] = useState(false);
  const [fresh, setFresh] = useState<CardItem[]>([]);
  const [pool, setPool] = useState<CardItem[]>([]);
  const [poolTotal, setPoolTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [assignTo, setAssignTo] = useState<CardItem | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const loadPool = () => {
    setLoading(true);
    unwrap<{ cards: CardItem[]; total: number }>(api.get('/qr-cards/unassigned'))
      .then((r) => {
        setPool(r.cards);
        setPoolTotal(r.total);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  };
  useEffect(loadPool, []);

  const generate = async () => {
    const n = Math.max(1, Math.min(200, Number(count) || 0));
    setGenerating(true);
    try {
      const cards = await unwrap<CardItem[]>(api.post('/qr-cards/batch', { count: n }));
      setFresh(cards);
      setSelected(new Set(cards.map((c) => c.id))); // pre-select the fresh batch
      toast.success(t('qrCards.generated', { n: cards.length }));
      loadPool();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setGenerating(false);
    }
  };

  const all = useMemo(() => [...fresh, ...pool], [fresh, pool]);
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const selectAll = () => setSelected(new Set(all.map((c) => c.id)));
  const clearSel = () => setSelected(new Set());
  const printSelected = () =>
    printQrCards(
      all
        .filter((c) => selected.has(c.id))
        .map((c) => ({ qrDataUrl: c.qrDataUrl, code: c.cardCode })),
      'IRON GYM · QR',
    );

  return (
    <div id="qr-print">
      <PageHeader title={t('qrCards.title')} description={t('qrCards.desc')} />

      <Card className="mb-4 flex flex-wrap items-end gap-3 p-4 print:hidden">
        <Field label={t('qrCards.count')}>
          <Input
            type="number"
            min={1}
            max={200}
            className="w-32"
            value={count}
            onChange={(e) => setCount(e.target.value)}
          />
        </Field>
        <Button onClick={generate} disabled={generating}>
          {generating ? (
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="me-1 h-4 w-4" />
          )}
          {t('qrCards.generate')}
        </Button>

        <div className="ms-auto flex items-center gap-2">
          <button
            onClick={selected.size === all.length ? clearSel : selectAll}
            className="rounded-md px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {selected.size === all.length && all.length > 0
              ? t('qrCards.clear')
              : t('qrCards.selectAll')}
          </button>
          <Button variant="outline" disabled={selected.size === 0} onClick={printSelected}>
            <Printer className="me-1 h-4 w-4" />
            {t('qrCards.printSelected', { n: selected.size })}
          </Button>
        </div>
      </Card>

      {selected.size === 0 && (
        <p className="mb-3 text-xs text-muted-foreground print:hidden">{t('qrCards.selectToPrint')}</p>
      )}

      {fresh.length > 0 && (
        <div className="mb-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground print:hidden">
            {t('qrCards.newBatch')}
          </p>
          <CardGrid cards={fresh} selected={selected} onToggle={toggle} onAssign={setAssignTo} />
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between print:hidden">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t('qrCards.poolTitle')}
          </h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            {t('qrCards.poolCount', { n: poolTotal })}
          </span>
        </div>
        {loading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border p-3">
                <Skeleton className="aspect-square w-full rounded" />
                <Skeleton className="mx-auto mt-2 h-3.5 w-24" />
                <Skeleton className="mt-2 h-8 w-full" />
              </div>
            ))}
          </div>
        )}
        {!loading && pool.length === 0 && (
          <p className="text-sm text-muted-foreground print:hidden">{t('qrCards.empty')}</p>
        )}
        <CardGrid cards={pool} selected={selected} onToggle={toggle} onAssign={setAssignTo} />
      </div>

      {assignTo && (
        <AssignDialog
          card={assignTo}
          onClose={() => setAssignTo(null)}
          onAssigned={() => {
            setAssignTo(null);
            setFresh((f) => f.filter((c) => c.id !== assignTo.id));
            setSelected((s) => {
              const n = new Set(s);
              n.delete(assignTo.id);
              return n;
            });
            toast.success(t('qrCards.assigned'));
            loadPool();
          }}
        />
      )}
    </div>
  );
}

function CardGrid({
  cards,
  selected,
  onToggle,
  onAssign,
}: {
  cards: CardItem[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onAssign: (c: CardItem) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 print:grid-cols-3 print:gap-4">
      {cards.map((c) => {
        const on = selected.has(c.id);
        return (
          <div
            key={c.id}
            data-print={on ? '1' : undefined}
            className={cn(
              'qr-card relative flex flex-col items-center gap-2 rounded-lg border bg-surface p-3 transition-colors',
              on ? 'border-accent ring-1 ring-accent/40' : 'border-border',
              'print:border-2 print:border-black print:ring-0',
            )}
          >
            <button
              onClick={() => onToggle(c.id)}
              className={cn(
                'absolute start-2 top-2 flex h-5 w-5 items-center justify-center rounded border transition-colors print:hidden',
                on ? 'border-accent bg-accent text-accent-foreground' : 'border-border bg-surface',
              )}
              aria-label="Select card"
            >
              {on && <Check className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() =>
                printQrCards([{ qrDataUrl: c.qrDataUrl, code: c.cardCode }], 'IRON GYM · QR')
              }
              className="absolute end-2 top-2 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground print:hidden"
              aria-label="Print card"
            >
              <Printer className="h-3.5 w-3.5" />
            </button>
            <img src={c.qrDataUrl} alt={c.cardCode} className="w-full rounded bg-white p-1" />
            <span className="select-all font-mono text-sm font-bold tracking-wider">
              {c.cardCode}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="w-full print:hidden"
              onClick={() => onAssign(c)}
            >
              {t('qrCards.assign')}
            </Button>
          </div>
        );
      })}
    </div>
  );
}

function AssignDialog({
  card,
  onClose,
  onAssigned,
}: {
  card: CardItem;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const lng = i18n.language;
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const params = useMemo(() => ({ search: search || undefined, limit: 8 }), [search]);
  const { data } = useMembers(params);

  const assign = async (memberId: string) => {
    setBusy(true);
    try {
      await api.post('/qr-cards/assign', { cardCode: card.cardCode, memberId });
      onAssigned();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title={t('qrCards.assignTitle', { code: card.cardCode })} size="sm">
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
        <Input
          autoFocus
          className="ps-9"
          placeholder={t('qrCards.pickMember')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="max-h-72 space-y-1 overflow-y-auto">
        {(data?.data ?? []).map((m) => (
          <button
            key={m._id}
            disabled={busy}
            onClick={() => assign(m._id)}
            className="flex w-full items-start justify-between gap-3 rounded-md border border-border px-3 py-2 text-start text-sm transition-colors hover:border-accent hover:bg-muted/40 disabled:opacity-50"
          >
            <span className="min-w-0">
              <span className="block truncate">
                {m.user?.firstName} {m.user?.lastName}
                <span className="text-muted-foreground"> · {m.memberCode}</span>
              </span>
              {m.user?.email && (
                <span className="block truncate text-xs text-muted-foreground" dir="ltr">
                  {m.user.email}
                </span>
              )}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground" dir="ltr">
              {m.user?.phone}
            </span>
          </button>
        ))}
        {(data?.data ?? []).length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {lng === 'ar' ? 'لا نتائج' : 'No results'}
          </p>
        )}
      </div>
    </Dialog>
  );
}
