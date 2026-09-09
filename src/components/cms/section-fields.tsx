import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { Input, Textarea, Field } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { ImageField } from '@/components/ui/image-field';

type Data = Record<string, unknown>;

/** `fld` is an i18n key under website.fld.*; `lang` appends (EN)/(AR). */
type Spec =
  | { kind: 'text' | 'textarea'; key: string; fld: string; lang?: 'en' | 'ar' }
  | { kind: 'image'; key: string; fld: string }
  | { kind: 'list'; key: string; fld: string; item: Spec[] };

const RICH: Spec[] = [
  { kind: 'text', key: 'kickerEn', fld: 'kicker', lang: 'en' },
  { kind: 'text', key: 'kickerAr', fld: 'kicker', lang: 'ar' },
  { kind: 'text', key: 'titleEn', fld: 'title', lang: 'en' },
  { kind: 'text', key: 'titleAr', fld: 'title', lang: 'ar' },
  { kind: 'textarea', key: 'bodyEn', fld: 'body', lang: 'en' },
  { kind: 'textarea', key: 'bodyAr', fld: 'body', lang: 'ar' },
  { kind: 'image', key: 'imageUrl', fld: 'image' },
];

const SPECS: Record<string, Spec[]> = {
  HERO: [
    { kind: 'text', key: 'titleEn', fld: 'title', lang: 'en' },
    { kind: 'text', key: 'titleAr', fld: 'title', lang: 'ar' },
    { kind: 'textarea', key: 'subtitleEn', fld: 'subtitle', lang: 'en' },
    { kind: 'textarea', key: 'subtitleAr', fld: 'subtitle', lang: 'ar' },
    { kind: 'image', key: 'imageUrl', fld: 'bgImage' },
  ],
  STATS: [
    {
      kind: 'list',
      key: 'items',
      fld: 'stats',
      item: [
        { kind: 'text', key: 'valueEn', fld: 'value' },
        { kind: 'text', key: 'labelEn', fld: 'label', lang: 'en' },
        { kind: 'text', key: 'labelAr', fld: 'label', lang: 'ar' },
      ],
    },
  ],
  CTA: [
    { kind: 'text', key: 'titleEn', fld: 'title', lang: 'en' },
    { kind: 'text', key: 'titleAr', fld: 'title', lang: 'ar' },
    { kind: 'text', key: 'buttonEn', fld: 'button', lang: 'en' },
    { kind: 'text', key: 'buttonAr', fld: 'button', lang: 'ar' },
  ],
  ABOUT_PREVIEW: RICH,
  TRAINING_EXPERIENCE: RICH,
  WHY_US: RICH,
  RICH_TEXT: RICH,
  FACILITIES: RICH,
  LOCATION: [
    { kind: 'text', key: 'titleEn', fld: 'title', lang: 'en' },
    { kind: 'text', key: 'titleAr', fld: 'title', lang: 'ar' },
    { kind: 'text', key: 'addressEn', fld: 'address', lang: 'en' },
    { kind: 'text', key: 'addressAr', fld: 'address', lang: 'ar' },
    { kind: 'text', key: 'mapUrl', fld: 'mapUrl' },
  ],
  MEMBERSHIP_PLANS: [
    { kind: 'text', key: 'titleEn', fld: 'title', lang: 'en' },
    { kind: 'text', key: 'titleAr', fld: 'title', lang: 'ar' },
  ],
  FAQ: [
    {
      kind: 'list',
      key: 'items',
      fld: 'questions',
      item: [
        { kind: 'text', key: 'questionEn', fld: 'question', lang: 'en' },
        { kind: 'text', key: 'questionAr', fld: 'question', lang: 'ar' },
        { kind: 'textarea', key: 'answerEn', fld: 'answer', lang: 'en' },
        { kind: 'textarea', key: 'answerAr', fld: 'answer', lang: 'ar' },
      ],
    },
  ],
  TESTIMONIALS: [
    {
      kind: 'list',
      key: 'items',
      fld: 'testimonials',
      item: [
        { kind: 'text', key: 'nameEn', fld: 'name' },
        { kind: 'text', key: 'roleEn', fld: 'role', lang: 'en' },
        { kind: 'text', key: 'roleAr', fld: 'role', lang: 'ar' },
        { kind: 'textarea', key: 'quoteEn', fld: 'quote', lang: 'en' },
        { kind: 'textarea', key: 'quoteAr', fld: 'quote', lang: 'ar' },
      ],
    },
  ],
  TRAINERS: [
    {
      kind: 'list',
      key: 'items',
      fld: 'trainers',
      item: [
        { kind: 'text', key: 'nameEn', fld: 'name' },
        { kind: 'text', key: 'specEn', fld: 'spec', lang: 'en' },
        { kind: 'text', key: 'specAr', fld: 'spec', lang: 'ar' },
        { kind: 'textarea', key: 'bioEn', fld: 'bio', lang: 'en' },
        { kind: 'textarea', key: 'bioAr', fld: 'bio', lang: 'ar' },
        { kind: 'image', key: 'imageUrl', fld: 'photo' },
      ],
    },
  ],
};

export const KNOWN_SECTION_TYPES = Object.keys(SPECS);

function useLabel() {
  const { t } = useTranslation();
  return (fld: string, lang?: 'en' | 'ar') =>
    lang ? `${t(`website.fld.${fld}`)} (${t(`website.fld.${lang}`)})` : t(`website.fld.${fld}`);
}

export function SectionFields({
  type,
  data,
  onChange,
}: {
  type: string;
  data: Data;
  onChange: (next: Data) => void;
}) {
  const { t } = useTranslation();
  const label = useLabel();
  const spec = SPECS[type];

  if (!spec) {
    return (
      <textarea
        className="w-full resize-y rounded-md border border-border bg-transparent p-2 font-mono text-xs outline-none"
        rows={5}
        defaultValue={JSON.stringify(data, null, 2)}
        onBlur={(e) => {
          try {
            onChange(JSON.parse(e.target.value || '{}'));
          } catch {
            /* keep */
          }
        }}
      />
    );
  }

  const set = (k: string, v: unknown) => onChange({ ...data, [k]: v });

  return (
    <div className="space-y-3">
      {(type === 'MEMBERSHIP_PLANS' || type === 'TRAINERS' || type === 'FACILITIES') && (
        <p className="rounded-md bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">
          {t('website.section.liveDataNote')}
        </p>
      )}
      {spec.map((f) =>
        f.kind === 'list' ? (
          <ListField
            key={f.key}
            spec={f}
            rows={Array.isArray(data[f.key]) ? (data[f.key] as Data[]) : []}
            onChange={(rows) => set(f.key, rows)}
          />
        ) : f.kind === 'image' ? (
          <Field key={f.key} label={label(f.fld)}>
            <ImageField value={(data[f.key] as string) ?? ''} onChange={(url) => set(f.key, url)} />
          </Field>
        ) : (
          <Field key={f.key} label={label(f.fld, f.lang)}>
            {f.kind === 'textarea' ? (
              <Textarea
                dir={f.lang === 'ar' ? 'rtl' : 'ltr'}
                value={(data[f.key] as string) ?? ''}
                onChange={(e) => set(f.key, e.target.value)}
              />
            ) : (
              <Input
                dir={f.lang === 'ar' ? 'rtl' : 'ltr'}
                value={(data[f.key] as string) ?? ''}
                onChange={(e) => set(f.key, e.target.value)}
              />
            )}
          </Field>
        ),
      )}
    </div>
  );
}

function ListField({
  spec,
  rows,
  onChange,
}: {
  spec: Extract<Spec, { kind: 'list' }>;
  rows: Data[];
  onChange: (rows: Data[]) => void;
}) {
  const { t } = useTranslation();
  const label = useLabel();
  const patch = (i: number, k: string, v: unknown) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));

  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label(spec.fld)}
      </p>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="rounded-md border border-border/70 bg-surface-raised/40 p-2.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">#{i + 1}</span>
              <button
                type="button"
                onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
                className="rounded p-1 text-muted-foreground hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {spec.item.map((f) =>
                f.kind === 'image' ? (
                  <div key={f.key} className="sm:col-span-2">
                    <Field label={label(f.fld)}>
                      <ImageField
                        value={(row[f.key] as string) ?? ''}
                        onChange={(url) => patch(i, f.key, url)}
                      />
                    </Field>
                  </div>
                ) : (
                  <Field key={f.key} label={label(f.fld, 'lang' in f ? f.lang : undefined)}>
                    {f.kind === 'textarea' ? (
                      <Textarea
                        dir={'lang' in f && f.lang === 'ar' ? 'rtl' : 'ltr'}
                        value={(row[f.key] as string) ?? ''}
                        onChange={(e) => patch(i, f.key, e.target.value)}
                      />
                    ) : (
                      <Input
                        dir={'lang' in f && f.lang === 'ar' ? 'rtl' : 'ltr'}
                        value={(row[f.key] as string) ?? ''}
                        onChange={(e) => patch(i, f.key, e.target.value)}
                      />
                    )}
                  </Field>
                ),
              )}
            </div>
          </div>
        ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange([...rows, {}])}
        >
          <Plus className="h-4 w-4" /> {t('website.section.addItem')}
        </Button>
      </div>
    </div>
  );
}
