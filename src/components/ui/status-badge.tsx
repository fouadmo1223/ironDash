import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

const TONES: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger/15 text-danger',
  info: 'bg-sky-500/15 text-sky-400',
  accent: 'bg-accent/15 text-accent',
};

const SUBSCRIPTION_TONE: Record<string, Tone> = {
  ACTIVE: 'success',
  EXPIRING_SOON: 'warning',
  EXPIRED: 'danger',
  FROZEN: 'info',
  CANCELLED: 'neutral',
  PENDING_PAYMENT: 'warning',
  PAYMENT_UNDER_REVIEW: 'info',
};

const PAYMENT_TONE: Record<string, Tone> = {
  APPROVED: 'success',
  UNDER_REVIEW: 'info',
  PENDING: 'warning',
  REJECTED: 'danger',
  FAKE: 'danger',
  CANCELLED: 'neutral',
  REFUND_REQUESTED: 'warning',
  REFUNDED: 'neutral',
};

const ACCESS_TONE: Record<string, Tone> = {
  APPROVED: 'success',
  ALREADY_CHECKED_IN: 'warning',
  DENIED_INVALID: 'danger',
  DENIED_EXPIRED: 'danger',
  DENIED_FROZEN: 'info',
  DENIED_NO_MEMBERSHIP: 'danger',
  DENIED_PENDING_PAYMENT: 'warning',
};

export function StatusBadge({
  value,
  kind = 'generic',
  label,
}: {
  value: string;
  kind?: 'subscription' | 'payment' | 'access' | 'generic';
  label?: string;
}) {
  const { t } = useTranslation();
  const map =
    kind === 'subscription'
      ? SUBSCRIPTION_TONE
      : kind === 'payment'
        ? PAYMENT_TONE
        : kind === 'access'
          ? ACCESS_TONE
          : {};
  const tone: Tone = map[value] ?? 'neutral';
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide',
        TONES[tone],
      )}
    >
      {label
        ? t(`statusLabel.${label}`, { defaultValue: label })
        : t(`statusLabel.${value}`, {
            defaultValue: value.replaceAll('_', ' ').toLowerCase(),
          })}
    </span>
  );
}
