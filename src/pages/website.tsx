import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GripVertical, Eye, EyeOff, Plus, Trash2, ChevronDown, Clock } from 'lucide-react';
import { PageHeader, Card, Field, Input, Textarea, Select } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { ImageField } from '@/components/ui/image-field';
import { SectionFields } from '@/components/cms/section-fields';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { useCmsPages } from '@/lib/api/hooks';
import { api, unwrap } from '@/lib/api';

interface Section {
  key: string;
  type: string;
  enabled: boolean;
  order: number;
  data: Record<string, unknown>;
}
interface CmsPage {
  slug: string;
  nameEn: string;
  titleEn: string;
  titleAr: string;
  sections: Section[];
  isPublished: boolean;
}

const TABS = ['pages', 'site'] as const;

export function WebsitePage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<(typeof TABS)[number]>('pages');
  return (
    <div>
      <PageHeader title={t('website.title')} />
      <div className="mb-4 flex gap-1 border-b border-border">
        {TABS.map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={`px-4 py-2 text-sm font-medium capitalize ${
              tab === tb
                ? 'border-b-2 border-accent text-accent'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tb === 'site' ? t('website.tabSite') : t('website.tabPages')}
          </button>
        ))}
      </div>
      {tab === 'pages' ? <PagesTab /> : <SiteTab />}
    </div>
  );
}

function PagesTab() {
  const { t } = useTranslation();
  const { data: pages = [] } = useCmsPages();
  const [slug, setSlug] = useState<string | null>(null);

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      <Card className="h-fit p-2">
        {pages.map((p) => (
          <button
            key={p.slug}
            onClick={() => setSlug(p.slug)}
            className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm ${
              slug === p.slug ? 'bg-accent/10 text-accent' : 'hover:bg-muted'
            }`}
          >
            <span>{p.nameEn}</span>
            {p.isPublished ? (
              <StatusBadge value="LIVE" label="live" kind="generic" />
            ) : (
              <StatusBadge value="DRAFT" label="draft" kind="generic" />
            )}
          </button>
        ))}
        {pages.length === 0 && (
          <p className="p-3 text-sm text-muted-foreground">{t('website.noPages')}</p>
        )}
      </Card>
      {slug ? <PageEditor slug={slug} /> : <Card className="p-8 text-center text-sm text-muted-foreground">{t('website.selectPage')}</Card>}
    </div>
  );
}

function PageEditor({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [page, setPage] = useState<CmsPage | null>(null);
  const [saving, setSaving] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const load = () => {
    unwrap<CmsPage>(api.get(`/cms/pages/${slug}`)).then(setPage).catch(() => setPage(null));
  };
  useEffect(load, [slug]);

  if (!page) return <Card className="p-8 text-center text-sm text-muted-foreground">{t('common.loading')}</Card>;

  const move = (i: number, dir: -1 | 1) => {
    const next = [...page.sections];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    next.forEach((s, idx) => (s.order = idx));
    setPage({ ...page, sections: next });
  };

  const saveSections = async () => {
    setSaving(true);
    try {
      await api.patch(`/cms/pages/${slug}/sections`, { sections: page.sections });
      toast.success(t('website.sectionsSaved'));
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async () => {
    await api.post(`/cms/pages/${slug}/${page.isPublished ? 'unpublish' : 'publish'}`, {});
    toast.success(page.isPublished ? t('website.unpublished') : t('website.published'));
    load();
  };

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold uppercase">{page.nameEn}</h2>
          <p className="text-xs text-muted-foreground">/{slug}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={togglePublish}>
            {page.isPublished ? t('website.unpublish') : t('website.publish')}
          </Button>
          <Button size="sm" onClick={saveSections} disabled={saving}>
            {t('website.saveSections')}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {page.sections.map((s, i) => {
          const isOpen = openKey === s.key;
          return (
            <div key={s.key} className="rounded-md border border-border">
              <div className="flex items-center gap-2 p-2">
                <div className="flex flex-col">
                  <button onClick={() => move(i, -1)} className="text-muted-foreground hover:text-foreground">
                    ▲
                  </button>
                  <button onClick={() => move(i, 1)} className="text-muted-foreground hover:text-foreground">
                    ▼
                  </button>
                </div>
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <button
                  type="button"
                  onClick={() => setOpenKey(isOpen ? null : s.key)}
                  className="flex flex-1 items-center gap-2 text-start"
                >
                  <ChevronDown
                    className={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')}
                  />
                  <span className={cn('text-sm font-medium', !s.enabled && 'text-muted-foreground line-through')}>
                    {s.type}
                  </span>
                  <span className="text-xs text-muted-foreground">{s.key}</span>
                </button>
                <button
                  onClick={() =>
                    setPage({
                      ...page,
                      sections: page.sections.map((x) =>
                        x.key === s.key ? { ...x, enabled: !x.enabled } : x,
                      ),
                    })
                  }
                  className="text-muted-foreground hover:text-foreground"
                >
                  {s.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
              {isOpen && (
                <div className="border-t border-border/60 p-3">
                  <SectionFields
                    type={s.type}
                    data={s.data}
                    onChange={(data) =>
                      setPage({
                        ...page,
                        sections: page.sections.map((x) => (x.key === s.key ? { ...x, data } : x)),
                      })
                    }
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SiteState = Record<string, any>;

function PhoneList({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const { t } = useTranslation();
  return (
    <Field label={label}>
      <div className="space-y-2">
        {(values.length ? values : ['']).map((v, i) => (
          <div key={i} className="flex gap-2">
            <Input
              dir="ltr"
              value={v}
              onChange={(e) => {
                const next = [...(values.length ? values : [''])];
                next[i] = e.target.value;
                onChange(next);
              }}
            />
            {values.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onChange(values.filter((_, j) => j !== i))}
              >
                ✕
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...(values.length ? values : ['']), ''])}
        >
          {t('website.addNumber')}
        </Button>
      </div>
    </Field>
  );
}

const COPY_HELP = [
  'home.hero.title / eyebrow / subtitle / primaryCta / secondaryCta',
  'home.manifesto.body · home.numbersBand.* · home.programs.* · home.gallery.*',
  'home.faq.items[n].q / a · home.experience.* · home.location.*',
  'aboutPage.intro / timeline / values / numbers / ethos / cta',
  'facilitiesPage.intro / areas / spec / cta · trainersPage.roster / method / cta',
  'contactPage.title / kicker / men / women',
];

function CopyEditor({
  value,
  onChange,
}: {
  value: { en: Record<string, unknown>; ar: Record<string, unknown> };
  onChange: (next: { en: Record<string, unknown>; ar: Record<string, unknown> }) => void;
}) {
  const { t } = useTranslation();
  const [text, setText] = useState({
    en: JSON.stringify(value.en ?? {}, null, 2),
    ar: JSON.stringify(value.ar ?? {}, null, 2),
  });
  const [err, setErr] = useState<{ en?: string; ar?: string }>({});

  const commit = (loc: 'en' | 'ar', raw: string) => {
    setText((t) => ({ ...t, [loc]: raw }));
    try {
      const parsed = raw.trim() ? JSON.parse(raw) : {};
      setErr((e) => ({ ...e, [loc]: undefined }));
      onChange({ ...value, [loc]: parsed });
    } catch (e) {
      setErr((prev) => ({ ...prev, [loc]: (e as Error).message }));
    }
  };

  const format = (loc: 'en' | 'ar') => {
    try {
      const pretty = JSON.stringify(JSON.parse(text[loc] || '{}'), null, 2);
      setText((s) => ({ ...s, [loc]: pretty }));
    } catch {
      /* leave as-is */
    }
  };

  return (
    <Card className="overflow-hidden">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-2 p-4">
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
          <h3 className="text-sm font-semibold">{t('website.copyTitle')}</h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t('common.advanced', 'Advanced')}
          </span>
        </summary>

        <div className="space-y-4 border-t border-border/60 p-4">
          <p className="text-xs leading-relaxed text-muted-foreground">{t('website.copyHint')}</p>

          <div className="rounded-md border border-border/60 bg-muted/30 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('website.commonKeys')}
            </p>
            <ul className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
              {COPY_HELP.map((l) => (
                <li key={l} className="font-mono">
                  {l}
                </li>
              ))}
            </ul>
            <pre className="mt-3 overflow-x-auto rounded bg-background/60 p-2 text-[11px]" dir="ltr">
{`{ "home": { "hero": { "title": "قوة بلا حدود" } } }`}
            </pre>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {(['en', 'ar'] as const).map((loc) => (
              <div key={loc}>
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">
                    {loc === 'en' ? t('website.enOverrides') : t('website.arOverrides')}
                  </span>
                  <button
                    type="button"
                    onClick={() => format(loc)}
                    className="text-[11px] font-medium text-accent hover:underline"
                  >
                    {t('common.format', 'Format')}
                  </button>
                  {err[loc] && (
                    <span className="ms-auto truncate text-[11px] text-danger" title={err[loc]}>
                      {t('website.invalidJson')}
                    </span>
                  )}
                </div>
                <textarea
                  dir="ltr"
                  spellCheck={false}
                  className={cn(
                    'w-full resize-y rounded-md border bg-surface-raised/40 p-2.5 font-mono text-xs leading-relaxed outline-none focus:border-accent',
                    err[loc] ? 'border-danger' : 'border-border',
                  )}
                  rows={12}
                  value={text[loc]}
                  onChange={(e) => commit(loc, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      </details>
    </Card>
  );
}

function SiteTab() {
  const { t } = useTranslation();
  const toast = useToast();
  const [site, setSite] = useState<SiteState>({
    contact: {},
    social: {},
    brand: {},
    hours: {},
    media: {},
    copy: { en: {}, ar: {} },
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    unwrap<SiteState>(api.get('/cms/site'))
      .then((s) =>
        setSite({
          contact: s.contact ?? {},
          social: s.social ?? {},
          brand: s.brand ?? {},
          hours: { schedule: toScheduleRows(s.hours ?? {}) },
          media: s.media ?? {},
          copy: { en: s.copy?.en ?? {}, ar: s.copy?.ar ?? {} },
        }),
      )
      .catch(() => undefined);
  }, []);

  const set = (group: string, key: string, value: unknown) =>
    setSite((s) => ({ ...s, [group]: { ...s[group], [key]: value } }));

  const asList = (v: unknown): string[] =>
    Array.isArray(v) ? (v as string[]) : v ? [String(v)] : [''];

  const save = async () => {
    setSaving(true);
    try {
      // normalise: drop empty entries
      const payload: SiteState = {
        ...site,
        contact: {
          ...site.contact,
          phones: asList(site.contact.phones ?? site.contact.phone).filter(Boolean),
          whatsapp: asList(site.contact.whatsapp).filter(Boolean),
        },
      };
      delete payload.contact.phone;
      await api.put('/cms/site', payload);
      toast.success(t('website.siteSaved'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-3 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('website.contact')}
        </h3>
        <PhoneList
          label={t('website.callNumbers')}
          values={asList(site.contact.phones ?? site.contact.phone)}
          onChange={(next) => set('contact', 'phones', next)}
        />
        <PhoneList
          label={t('website.whatsappNumbers')}
          values={asList(site.contact.whatsapp)}
          onChange={(next) => set('contact', 'whatsapp', next)}
        />
        <Field label={t('website.email')}>
          <Input dir="ltr" value={site.contact.email ?? ''} onChange={(e) => set('contact', 'email', e.target.value)} />
        </Field>
        <Field label={t('website.addressEn')}>
          <Textarea value={site.contact.addressEn ?? ''} onChange={(e) => set('contact', 'addressEn', e.target.value)} />
        </Field>
        <Field label={t('website.addressAr')}>
          <Textarea dir="rtl" value={site.contact.addressAr ?? ''} onChange={(e) => set('contact', 'addressAr', e.target.value)} />
        </Field>
        <Field label={t('website.mapLink', 'Map / directions link')}>
          <Input
            dir="ltr"
            placeholder="https://maps.google.com/?q=..."
            value={site.contact.mapUrl ?? ''}
            onChange={(e) => set('contact', 'mapUrl', e.target.value)}
          />
        </Field>
      </Card>
      <Card className="space-y-3 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('website.openingHours')}
        </h3>
        <p className="text-xs text-muted-foreground">{t('website.hoursHint')}</p>
        <ScheduleEditor
          rows={toScheduleRows(site.hours)}
          onChange={(rows) => set('hours', 'schedule', rows)}
        />
      </Card>
      <Card className="space-y-3 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('website.images')}
        </h3>
        <p className="text-xs text-muted-foreground">
          {t('website.imagesHint')}
        </p>
        <div className="grid gap-3">
          {(
            [
              ['hero', t('website.img.hero')],
              ['athleteBack', t('website.img.athleteBack')],
              ['barbell', t('website.img.barbell')],
              ['dumbbells', t('website.img.dumbbells')],
              ['squat', t('website.img.squat')],
              ['deadlift', t('website.img.deadlift')],
              ['curl', t('website.img.curl')],
              ['core', t('website.img.core')],
              ['row', t('website.img.row')],
              ['floor', t('website.img.floor')],
            ] as const
          ).map(([k, lbl]) => (
            <Field key={k} label={lbl}>
              <ImageField
                value={site.media[k] ?? ''}
                onChange={(url) => set('media', k, url)}
              />
            </Field>
          ))}
          <Field label={t('website.gallery')}>
            <Textarea
              dir="ltr"
              rows={5}
              value={
                Array.isArray(site.media.gallery)
                  ? site.media.gallery.join('\n')
                  : (site.media.gallery ?? '')
              }
              onChange={(e) =>
                set(
                  'media',
                  'gallery',
                  e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                )
              }
            />
          </Field>
        </div>
      </Card>
      <Card className="space-y-3 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('website.social')}
        </h3>
        {['instagram', 'facebook', 'tiktok', 'youtube', 'x'].map((k) => (
          <Field key={k} label={k}>
            <Input dir="ltr" value={site.social[k] ?? ''} onChange={(e) => set('social', k, e.target.value)} />
          </Field>
        ))}
      </Card>
      <div className="lg:col-span-2">
        <CopyEditor
          value={site.copy ?? { en: {}, ar: {} }}
          onChange={(next) => setSite((s) => ({ ...s, copy: next }))}
        />
      </div>
      <div className="lg:col-span-2">
        <Button onClick={save} disabled={saving}>
          {t('common.save')}
        </Button>
      </div>
    </div>
  );
}

/* ───────────────────────── Opening-hours editor ───────────────────────── */

const WEEK = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'] as const;
type Day = (typeof WEEK)[number];

export interface ScheduleRow {
  audience: 'men' | 'women';
  days: Day[];
  open: string;
  close: string;
}

/** 12-hour AM/PM options every 30 minutes — offered in a datalist (type or pick). */
const TIME_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let m = 0; m < 24 * 60; m += 30) {
    const h24 = Math.floor(m / 60);
    const min = m % 60;
    const ampm = h24 < 12 ? 'AM' : 'PM';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    out.push(`${h12}:${String(min).padStart(2, '0')} ${ampm}`);
  }
  return out;
})();

/** Normalise any legacy / free-form value to a "h:mm AM/PM" string. */
function to12h(raw: string): string {
  const s = String(raw).trim();
  if (!s) return '';
  if (/\b(am|pm)\b/i.test(s)) {
    const m = s.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
    if (!m) return s;
    return `${Number(m[1])}:${m[2] ?? '00'} ${m[3].toUpperCase()}`;
  }
  const m = s.match(/(\d{1,2}):?(\d{2})?/);
  if (!m) return s;
  let h = Number(m[1]) % 24;
  const min = m[2] ?? '00';
  const ampm = h < 12 || h === 24 ? 'AM' : 'PM';
  h = h % 12 === 0 ? 12 : h % 12;
  return `${h}:${min} ${ampm}`;
}

const DEFAULT_ROW = (): ScheduleRow => ({
  audience: 'men',
  days: ['sun', 'mon', 'tue', 'wed', 'thu'],
  open: '5:00 AM',
  close: '12:00 AM',
});

/** Read `hours` in the new `{ schedule: [] }` shape, or migrate the legacy keys. */
function toScheduleRows(hours: any): ScheduleRow[] {
  if (Array.isArray(hours?.schedule)) {
    return (hours.schedule as any[]).map((r) => ({
      audience: r?.audience === 'women' ? 'women' : 'men',
      days: WEEK.filter((d) => Array.isArray(r?.days) && r.days.includes(d)),
      open: to12h(r?.open ?? ''),
      close: to12h(r?.close ?? ''),
    }));
  }
  const legacy: Array<[string, 'men' | 'women', Day[]]> = [
    ['menWeekday', 'men', ['sun', 'mon', 'tue', 'wed', 'thu']],
    ['menWeekend', 'men', ['fri', 'sat']],
    ['womenWeekday', 'women', ['sun', 'mon', 'tue', 'wed', 'thu']],
    ['womenWeekend', 'women', ['fri', 'sat']],
  ];
  const rows: ScheduleRow[] = [];
  for (const [k, audience, days] of legacy) {
    const raw = hours?.[k];
    if (!raw) continue;
    const [open, close] = String(raw).split(/\s*[—–-]\s*/);
    rows.push({ audience, days, open: to12h(open ?? ''), close: to12h(close ?? '') });
  }
  // Nothing configured yet → give the editor sensible dummy rows to tweak.
  return rows.length
    ? rows
    : [
        { ...DEFAULT_ROW(), audience: 'men' },
        { audience: 'women', days: ['sun', 'mon', 'tue', 'wed', 'thu'], open: '9:00 AM', close: '9:00 PM' },
      ];
}

/** Text field + a click-to-open dropdown of every 30-min slot. Type or pick. */
function TimeCombo({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => setDraft(value), [value]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        onChange(to12h(draft));
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, draft, onChange]);

  const q = draft.trim().toLowerCase();
  const matches = q ? TIME_OPTIONS.filter((o) => o.toLowerCase().includes(q)) : TIME_OPTIONS;

  return (
    <div ref={wrapRef} className="relative" dir="ltr">
      <div className="flex h-9 w-32 items-center rounded-md border border-border bg-transparent focus-within:border-accent">
        <Clock className="ms-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <input
          className="h-full w-full bg-transparent px-1.5 text-center text-sm outline-none"
          placeholder="5:00 AM"
          value={draft}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setDraft(e.target.value);
            setOpen(true);
          }}
          onBlur={() => onChange(to12h(draft))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onChange(to12h(draft));
              setOpen(false);
            }
            if (e.key === 'Escape') setOpen(false);
          }}
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="me-1 rounded p-0.5 text-muted-foreground hover:text-foreground"
          tabIndex={-1}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
      {open && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 max-h-56 w-32 overflow-y-auto rounded-md border border-border bg-surface py-1 shadow-lg"
        >
          {matches.length === 0 && (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">—</p>
          )}
          {matches.map((o) => (
            <button
              key={o}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(o);
                setDraft(o);
                setOpen(false);
              }}
              className={cn(
                'block w-full px-2.5 py-1.5 text-start text-sm transition-colors hover:bg-muted',
                o === value && 'bg-accent/10 font-semibold text-accent',
              )}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ScheduleEditor({
  rows,
  onChange,
}: {
  rows: ScheduleRow[];
  onChange: (rows: ScheduleRow[]) => void;
}) {
  const { t } = useTranslation();
  const patch = (i: number, next: Partial<ScheduleRow>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...next } : r)));
  const toggleDay = (i: number, day: Day) => {
    const has = rows[i].days.includes(day);
    patch(i, {
      days: has
        ? rows[i].days.filter((d) => d !== day)
        : WEEK.filter((d) => d === day || rows[i].days.includes(d)),
    });
  };

  return (
    <div className="space-y-3">
      {rows.length === 0 && (
        <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
          {t('website.schedule.empty')}
        </p>
      )}
      {rows.map((row, i) => (
        <div key={i} className="space-y-2.5 rounded-lg border border-border bg-surface-raised/40 p-3">
          <div className="flex items-center gap-2">
            <Select
              className="h-9 w-32"
              value={row.audience}
              onChange={(e) => patch(i, { audience: e.target.value as 'men' | 'women' })}
            >
              <option value="men">{t('website.schedule.men')}</option>
              <option value="women">{t('website.schedule.women')}</option>
            </Select>
            <div className="ms-auto flex items-center gap-1.5" dir="ltr">
              <TimeCombo value={row.open} onChange={(v) => patch(i, { open: v })} />
              <span className="text-muted-foreground">—</span>
              <TimeCombo value={row.close} onChange={(v) => patch(i, { close: v })} />
            </div>
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger"
              aria-label={t('website.schedule.remove')}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {WEEK.map((d) => {
              const on = row.days.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(i, d)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    on
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70',
                  )}
                >
                  {t(`website.schedule.day.${d}`)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() =>
          onChange([
            ...rows,
            DEFAULT_ROW(),
          ])
        }
      >
        <Plus className="h-4 w-4" /> {t('website.schedule.add')}
      </Button>
    </div>
  );
}
