import { useTranslation } from 'react-i18next';

/** Temporary stand-in for dashboard sections that are wired to the API in later phases. */
export function PlaceholderPage({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation();
  return (
    <div>
      <h1 className="font-display text-2xl font-bold uppercase tracking-tight">{t(titleKey)}</h1>
      <div className="mt-6 rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        {t('common.empty')}
      </div>
    </div>
  );
}
