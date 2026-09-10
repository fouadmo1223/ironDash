import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, XCircle, Clock, ScanLine } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { PageHeader, Card } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useScan } from '@/lib/api/hooks';
import { apiError } from '@/lib/api';
import type { AccessResult } from '@/lib/api/types';
import { cn, formatDate, formatDateTime } from '@/lib/utils';

const TONE: Record<string, { bg: string; icon: typeof CheckCircle2; label: string }> = {
  APPROVED: { bg: 'bg-success/15 border-success/40', icon: CheckCircle2, label: 'Access granted' },
  ALREADY_CHECKED_IN: {
    bg: 'bg-warning/15 border-warning/40',
    icon: Clock,
    label: 'Already checked in',
  },
  DENIED_INVALID: { bg: 'bg-danger/15 border-danger/40', icon: XCircle, label: 'Invalid QR' },
  DENIED_EXPIRED: { bg: 'bg-danger/15 border-danger/40', icon: XCircle, label: 'Membership expired' },
  DENIED_FROZEN: { bg: 'bg-sky-500/15 border-sky-500/40', icon: XCircle, label: 'Membership frozen' },
  DENIED_NO_MEMBERSHIP: {
    bg: 'bg-danger/15 border-danger/40',
    icon: XCircle,
    label: 'No active membership',
  },
  DENIED_PENDING_PAYMENT: {
    bg: 'bg-warning/15 border-warning/40',
    icon: Clock,
    label: 'Payment under review',
  },
  DENIED_DAILY_LIMIT: {
    bg: 'bg-warning/15 border-warning/40',
    icon: Clock,
    label: 'Daily check-in limit reached',
  },
  DENIED_BANNED: {
    bg: 'bg-danger/15 border-danger/40',
    icon: XCircle,
    label: 'Member is banned',
  },
};

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className={cn('mt-0.5 font-medium', warn && 'text-warning')}>{value}</dd>
    </div>
  );
}

export function CheckInPage() {
  const { t, i18n } = useTranslation();
  const lng = i18n.language;
  const toast = useToast();
  const [value, setValue] = useState('');
  const [result, setResult] = useState<AccessResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scan = useScan();

  useEffect(() => {
    inputRef.current?.focus();
  }, [result]);

  const submit = (token: string) => {
    if (!token.trim()) return;
    scan.mutate(
      { token: token.trim(), source: 'QR_SCANNER' },
      {
        onSettled: () => {
          setValue('');
          setTimeout(() => inputRef.current?.focus(), 50);
        },
        onSuccess: (r) => setResult(r),
        onError: (e) => {
          setResult(null);
          toast.error(t('checkin.decision.DENIED_INVALID'), apiError(e));
        },
      },
    );
  };

  const tone = result ? TONE[result.decision] ?? TONE.DENIED_INVALID : null;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t('checkin.title')} description={t('checkin.desc')} />

      <Card className="p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(value);
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <ScanLine className="pointer-events-none absolute inset-y-0 start-3 my-auto h-5 w-5 text-muted-foreground" />
            <input
              ref={inputRef}
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={t('checkin.placeholder')}
              className="h-12 w-full rounded-md border border-input bg-surface ps-10 pe-3 text-base outline-none focus:border-accent"
            />
          </div>
          <Button size="lg" type="submit" disabled={scan.isPending}>
            {scan.isPending ? '…' : t('checkin.button')}
          </Button>
        </form>
      </Card>

      <AnimatePresence mode="wait">
        {result && tone && (
          <motion.div
            key={result.checkInAt ?? result.decision + Math.random()}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className={cn('mt-4 rounded-lg border p-6', tone.bg)}
          >
            <div className="flex items-center gap-4">
              <tone.icon className="h-12 w-12 shrink-0" />
              <div>
                <p className="font-display text-2xl font-bold uppercase">{t(`checkin.decision.${result.decision}`, { defaultValue: tone.label })}</p>
                {result.message && (
                  <p className="text-sm text-muted-foreground">{result.message}</p>
                )}
              </div>
            </div>

            {result.member && (
              <div className="mt-5 flex items-center gap-4 border-t border-border/60 pt-5">
                {result.member.image ? (
                  <img
                    src={result.member.image}
                    alt=""
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted font-display text-xl font-bold">
                    {result.member.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-display text-xl font-bold">{result.member.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {result.member.memberCode}
                    {result.member.phone && (
                      <span dir="ltr"> · {result.member.phone}</span>
                    )}
                  </p>
                </div>
                {result.subscription && (
                  <div className="text-end text-sm">
                    <p className="font-medium">
                      {lng === 'ar'
                        ? result.subscription.planNameAr
                        : result.subscription.planNameEn}
                    </p>
                    {result.subscription.endDate && (
                      <p className="text-muted-foreground">
                        {t('checkin.ends', {
                          date: formatDate(result.subscription.endDate),
                        })}
                        {result.subscription.daysRemaining > 0 &&
                          ` · ${t('checkin.daysLeft', {
                            count: result.subscription.daysRemaining,
                          })}`}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {result.subscription && (
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-border/60 pt-4 text-sm sm:grid-cols-4">
                <Stat
                  label={t('members.status')}
                  value={t(`statusLabel.${result.subscription.status}`, {
                    defaultValue: result.subscription.status,
                  })}
                />
                {result.subscription.allowedVisits > 0 && (
                  <Stat
                    label={t('checkin.visits')}
                    value={`${result.subscription.visitsUsed} / ${result.subscription.allowedVisits}`}
                  />
                )}
                {result.subscription.planFreezeDays > 0 && (
                  <Stat
                    label={t('checkin.freeze')}
                    value={`${result.subscription.freezeDaysUsed} / ${result.subscription.planFreezeDays}`}
                  />
                )}
                {result.subscription.remainingAmount > 0 && (
                  <Stat
                    label={t('members.balance')}
                    value={result.subscription.remainingAmount.toLocaleString()}
                    warn
                  />
                )}
                {result.member && result.member.dailyCheckInLimit > 0 && (
                  <Stat
                    label={t('checkin.todayLimit')}
                    value={`${result.member.todayCheckIns} / ${result.member.dailyCheckInLimit}`}
                    warn={result.member.todayCheckIns >= result.member.dailyCheckInLimit}
                  />
                )}
              </dl>
            )}

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
              {result.lastVisitAt && (
                <span>{t('checkin.lastVisit', { value: formatDateTime(result.lastVisitAt) })}</span>
              )}
              <span>{t('checkin.totalVisits', { count: result.totalApprovedVisits })}</span>
            </div>

            {result.decision.startsWith('DENIED_EXPIRED') && (
              <Button className="mt-4" variant="outline" size="sm">
                {t('checkin.openRenewal')}
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
