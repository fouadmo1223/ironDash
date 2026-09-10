import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  QrCode,
  RefreshCw,
  Loader2,
  Plus,
  Snowflake,
  Receipt,
  Printer,
  Ban,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { Card, PageHeader, Textarea, Field, Input, Select } from '@/components/ui/primitives';
import { DetailSkeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm';
import {
  useAttendance,
  useBranches,
  useMember,
  useMemberNotes,
  useMemberSubscriptions,
  usePayments,
  usePlans,
  useApiMutation,
  qk,
} from '@/lib/api/hooks';
import { useAuth } from '@/lib/auth';
import { api, apiError, apiErrorIs, apiStatus, unwrap } from '@/lib/api';
import type { AttendanceRow, PaymentRow, SubscriptionRow } from '@/lib/api/types';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { printQrCards } from '@/lib/print-qr';
import i18n from '@/i18n';

const TABS = ['overview', 'subscriptions', 'payments', 'attendance', 'notes'] as const;
type Tab = (typeof TABS)[number];

export function MemberProfilePage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const lng = i18n.language;
  const toast = useToast();
  const confirm = useConfirm();
  const qc = useQueryClient();
  const { can } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [qrOpen, setQrOpen] = useState(false);
  const [banOpen, setBanOpen] = useState(false);
  const [adminBusy, setAdminBusy] = useState(false);
  const [action, setAction] = useState<null | 'subscribe' | 'payment' | 'freeze'>(null);

  const { data: member, isLoading } = useMember(id);
  const name = member ? `${member.user?.firstName} ${member.user?.lastName}` : '';
  const banned = !!member?.user?.isBanned;
  const canModerate = can('member.delete');

  const unban = async () => {
    const ok = await confirm({
      title: t('members.unbanTitle'),
      message: t('members.unbanConfirm'),
      confirmLabel: t('members.unban'),
    });
    if (!ok) return;
    setAdminBusy(true);
    try {
      await api.post(`/members/${id}/unban`, {});
      await qc.invalidateQueries({ queryKey: ['members', id] });
      toast.success(t('members.memberUnbanned'));
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setAdminBusy(false);
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: t('members.deleteTitle'),
      message: t('members.deleteConfirm', { name, code: member?.memberCode ?? '' }),
      confirmLabel: t('members.delete'),
      danger: true,
    });
    if (!ok) return;
    setAdminBusy(true);
    try {
      await api.delete(`/members/${id}`);
      await qc.invalidateQueries({ queryKey: ['members'] });
      toast.success(t('members.memberDeleted'));
      navigate('/members');
    } catch (e) {
      toast.error(apiError(e));
      setAdminBusy(false);
    }
  };

  if (isLoading) {
    return (
      <DetailSkeleton />
    );
  }
  if (!member) return <p className="text-danger">{t('members.notFound')}</p>;

  const sub =
    member.currentSubscription && typeof member.currentSubscription === 'object'
      ? member.currentSubscription
      : null;

  return (
    <div>
      <PageHeader
        title={name}
        description={member.memberCode}
        actions={
          <>
            {banned && (
              <span className="inline-flex items-center gap-1 rounded-md border border-danger/40 bg-danger/10 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-danger">
                <Ban className="h-3.5 w-3.5" /> {t('members.bannedBadge')}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={() => setAction('subscribe')}>
              <Plus className="h-4 w-4" /> {t('members.subscription')}
            </Button>
            {sub && (
              <>
                <Button variant="outline" size="sm" onClick={() => setAction('payment')}>
                  <Receipt className="h-4 w-4" /> {t('members.recordPayment')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setAction('freeze')}>
                  <Snowflake className="h-4 w-4" /> {t('members.freeze')}
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={() => setQrOpen(true)}>
              <QrCode className="h-4 w-4" /> {t('members.qr')}
            </Button>
            {canModerate &&
              (banned ? (
                <Button variant="outline" size="sm" onClick={unban} disabled={adminBusy}>
                  <ShieldCheck className="h-4 w-4" /> {t('members.unban')}
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setBanOpen(true)} disabled={adminBusy}>
                  <Ban className="h-4 w-4" /> {t('members.ban')}
                </Button>
              ))}
            {canModerate && (
              <Button variant="danger" size="sm" onClick={remove} disabled={adminBusy}>
                <Trash2 className="h-4 w-4" /> {t('members.delete')}
              </Button>
            )}
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1 border-b border-border">
        {TABS.map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === tb
                ? 'border-b-2 border-accent text-accent'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t(`members.tab.${tb}`)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-4 md:col-span-2">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('members.currentMembership')}
            </h3>
            {sub ? (
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Row label={t('members.plan')} value={lng === 'ar' ? sub.planNameAr : sub.planNameEn} />
                <Row label={t('members.status')} value={<StatusBadge value={sub.status} kind="subscription" />} />
                <Row
                  label={t('members.start')}
                  value={sub.startDate ? formatDate(sub.startDate) : '—'}
                />
                <Row
                  label={t('members.end')}
                  value={sub.endDate ? formatDate(sub.endDate) : '—'}
                />
                <Row label={t('members.paid')} value={formatCurrency(sub.paidAmount, lng)} />
                <Row label={t('members.remaining')} value={formatCurrency(sub.remainingAmount, lng)} />
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">{t('members.noActiveSub')}</p>
            )}
          </Card>
          <Card className="p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('members.contact')}
            </h3>
            <dl className="space-y-2 text-sm">
              <Row label={t('members.email')} value={member.user?.email ?? '—'} />
              <Row label={t('members.phone')} value={<span dir="ltr">{member.user?.phone ?? '—'}</span>} />
              <Row
                label={t('members.branch')}
                value={
                  <BranchEditor
                    memberId={id}
                    branchId={member.primaryBranch?._id ?? ''}
                    fallback={
                      member.primaryBranch
                        ? lng === 'ar'
                          ? member.primaryBranch.nameAr
                          : member.primaryBranch.nameEn
                        : '—'
                    }
                  />
                }
              />
              <Row
                label={t('members.joined')}
                value={member.joinDate ? formatDate(member.joinDate) : '—'}
              />
              <Row
                label={t('members.dailyLimit')}
                value={<DailyLimitEditor memberId={id} value={member.dailyCheckInLimit ?? 0} />}
              />
            </dl>
          </Card>
        </div>
      )}

      {tab === 'subscriptions' && <SubscriptionsTab memberId={id} />}
      {tab === 'payments' && <PaymentsTab memberId={id} />}
      {tab === 'attendance' && <AttendanceTab memberId={id} />}
      {tab === 'notes' && <NotesTab memberId={id} />}

      <QrDialog memberId={id} memberCode={member.memberCode} open={qrOpen} onClose={() => setQrOpen(false)} />
      {action && (
        <MemberActionDialog
          kind={action}
          memberId={id}
          subscriptionId={sub?._id ?? null}
          onClose={() => setAction(null)}
        />
      )}
      <BanDialog
        open={banOpen}
        memberName={name}
        onClose={() => setBanOpen(false)}
        onBanned={async () => {
          setBanOpen(false);
          await qc.invalidateQueries({ queryKey: ['members', id] });
          toast.success(t('members.memberBanned'));
        }}
        memberId={id}
      />
    </div>
  );
}

function BanDialog({
  open,
  memberId,
  memberName,
  onClose,
  onBanned,
}: {
  open: boolean;
  memberId: string;
  memberName: string;
  onClose: () => void;
  onBanned: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const ban = async () => {
    setBusy(true);
    try {
      await api.post(`/members/${memberId}/ban`, { reason: reason.trim() || undefined });
      setReason('');
      onBanned();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('members.banTitle', { name: memberName })}
      description={t('members.banHint')}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={ban} disabled={busy}>
            {busy ? '…' : t('members.ban')}
          </Button>
        </>
      }
    >
      <Field label={`${t('members.banReasonLabel')} (${t('common.optional')})`}>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t('members.banReasonPlaceholder')}
        />
      </Field>
    </Dialog>
  );
}

function MemberActionDialog({
  kind,
  memberId,
  subscriptionId,
  onClose,
}: {
  kind: 'subscribe' | 'payment' | 'freeze';
  memberId: string;
  subscriptionId: string | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const { data: plans = [] } = usePlans();
  const [planId, setPlanId] = useState('');
  const [discount, setDiscount] = useState('0');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [freezeStart, setFreezeStart] = useState(new Date().toISOString().slice(0, 10));
  const [freezeDays, setFreezeDays] = useState('7');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      if (kind === 'subscribe') {
        await api.post('/subscriptions', {
          memberId,
          planId,
          discountAmount: Number(discount) || 0,
        });
        toast.success(t('members.subscriptionCreated'));
      } else if (kind === 'payment' && subscriptionId) {
        await api.post('/payments/record-manual', {
          subscriptionId,
          amount: Number(amount),
          transactionReference: reference || undefined,
        });
        toast.success(t('members.paymentRecorded'));
      } else if (kind === 'freeze' && subscriptionId) {
        const created = await unwrap<{ _id: string }>(
          api.post('/subscription-freezes', {
            subscriptionId,
            startDate: freezeStart,
            numberOfDays: Number(freezeDays),
            reason: reason || undefined,
          }),
        );
        await api.post(`/subscription-freezes/${created._id}/approve`, {});
        toast.success(t('members.subscriptionFrozen'));
      }
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['members'] }),
        qc.invalidateQueries({ queryKey: ['subscriptions'] }),
        qc.invalidateQueries({ queryKey: ['payments'] }),
      ]);
      onClose();
    } catch (e) {
      toast.error(t('members.actionFailed'), apiError(e));
    } finally {
      setBusy(false);
    }
  };

  const title =
    kind === 'subscribe'
      ? t('members.createSubscription')
      : kind === 'payment'
        ? t('members.recordReceivedPayment')
        : t('members.freezeSubscription');

  return (
    <Dialog
      open
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={submit}
            disabled={busy || (kind === 'subscribe' && !planId) || (kind === 'payment' && !amount)}
          >
            {busy ? '…' : t('common.confirm')}
          </Button>
        </>
      }
    >
      {kind === 'subscribe' && (
        <div className="space-y-3">
          <Field label={t('members.fieldPlan')}>
            <Select value={planId} onChange={(e) => setPlanId(e.target.value)}>
              <option value="">{t('common.choose')}</option>
              {plans
                .filter((p) => p.isActive)
                .map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.nameEn} — {p.price}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label={t('members.discountEgp')}>
            <Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </Field>
        </div>
      )}
      {kind === 'payment' && (
        <div className="space-y-3">
          <Field label={t('members.amountEgp')}>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label={`${t('members.reference')} (${t('common.optional')})`}>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} />
          </Field>
          <p className="text-xs text-muted-foreground">
            {t('members.paymentImmediateHint')}
          </p>
        </div>
      )}
      {kind === 'freeze' && (
        <div className="space-y-3">
          <Field label={t('members.startDate')}>
            <Input type="date" value={freezeStart} onChange={(e) => setFreezeStart(e.target.value)} />
          </Field>
          <Field label={t('members.numberOfDays')}>
            <Input type="number" value={freezeDays} onChange={(e) => setFreezeDays(e.target.value)} />
          </Field>
          <Field label={`${t('members.reason')} (${t('common.optional')})`}>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </div>
      )}
    </Dialog>
  );
}

function DailyLimitEditor({ memberId, value }: { memberId: string; value: number }) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const [v, setV] = useState(String(value));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const n = Math.max(0, Math.floor(Number(v) || 0));
    if (n === value) return;
    setSaving(true);
    try {
      await api.patch(`/members/${memberId}`, { dailyCheckInLimit: n });
      await qc.invalidateQueries({ queryKey: ['members', memberId] });
      toast.success(t('common.saved'));
    } catch (e) {
      toast.error(apiError(e));
      setV(String(value));
    } finally {
      setSaving(false);
    }
  };

  return (
    <span className="inline-flex items-center gap-2">
      <input
        type="number"
        min={0}
        max={50}
        value={v}
        disabled={saving}
        onChange={(e) => setV(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className="h-8 w-16 rounded-md border border-input bg-surface px-2 text-sm outline-none focus:border-accent"
      />
      <span className="text-xs text-muted-foreground">{t('members.dailyLimitHint')}</span>
    </span>
  );
}

function BranchEditor({
  memberId,
  branchId,
  fallback,
}: {
  memberId: string;
  branchId: string;
  fallback: string;
}) {
  const { t } = useTranslation();
  const lng = i18n.language;
  const toast = useToast();
  const qc = useQueryClient();
  const { can } = useAuth();
  const { data: branches = [] } = useBranches();
  const [saving, setSaving] = useState(false);

  if (!can('member.update')) return <>{fallback}</>;

  const change = async (next: string) => {
    if (next === branchId) return;
    setSaving(true);
    try {
      await api.patch(`/members/${memberId}`, { primaryBranchId: next || null });
      await qc.invalidateQueries({ queryKey: ['members', memberId] });
      toast.success(t('common.saved'));
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Select
      value={branchId}
      disabled={saving}
      onChange={(e) => change(e.target.value)}
      className="h-8 py-0 text-sm"
    >
      <option value="">{t('members.noBranch', '—')}</option>
      {branches.map((b) => (
        <option key={b._id} value={b._id}>
          {lng === 'ar' ? b.nameAr : b.nameEn}
        </option>
      ))}
    </Select>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}

function SubscriptionsTab({ memberId }: { memberId: string }) {
  const { t } = useTranslation();
  const { data = [], isLoading } = useMemberSubscriptions(memberId);
  const lng = i18n.language;
  const cols: Column<SubscriptionRow>[] = [
    { key: 'plan', header: t('members.plan'), cell: (s) => (lng === 'ar' ? s.planNameAr : s.planNameEn) },
    { key: 'status', header: t('members.status'), cell: (s) => <StatusBadge value={s.effectiveStatus ?? s.status} kind="subscription" /> },
    { key: 'start', header: t('members.start'), cell: (s) => (s.startDate ? formatDate(s.startDate) : '—') },
    { key: 'end', header: t('members.end'), cell: (s) => (s.endDate ? formatDate(s.endDate) : '—') },
    { key: 'price', header: t('members.price'), align: 'end', cell: (s) => formatCurrency(s.finalPrice, lng) },
    { key: 'rem', header: t('members.balance'), align: 'end', cell: (s) => formatCurrency(s.remainingAmount, lng) },
  ];
  return <DataTable columns={cols} rows={data} rowKey={(s) => s._id} isLoading={isLoading} emptyLabel={t('members.noSubscriptions')} />;
}

function PaymentsTab({ memberId }: { memberId: string }) {
  const { t } = useTranslation();
  const { data, isLoading } = usePayments({ memberId, tab: 'all', limit: 50 });
  const lng = i18n.language;
  const cols: Column<PaymentRow>[] = [
    { key: 'date', header: t('members.submitted'), cell: (p) => formatDateTime(p.createdAt) },
    { key: 'amount', header: t('members.amount'), align: 'end', cell: (p) => formatCurrency(p.amount, lng) },
    { key: 'method', header: t('members.method'), cell: (p) => p.paymentMethodLabel || '—' },
    { key: 'status', header: t('members.status'), cell: (p) => <StatusBadge value={p.status} kind="payment" /> },
    { key: 'receipt', header: t('members.receipt'), cell: (p) => p.receiptNumber || '—' },
  ];
  return <DataTable columns={cols} rows={data?.data} rowKey={(p) => p._id} isLoading={isLoading} emptyLabel={t('members.noPayments')} />;
}

function AttendanceTab({ memberId }: { memberId: string }) {
  const { t } = useTranslation();
  const { data, isLoading } = useAttendance({ memberId, limit: 50 });
  const cols: Column<AttendanceRow>[] = [
    { key: 'time', header: t('members.checkinCol'), cell: (a) => formatDateTime(a.checkInAt) },
    { key: 'status', header: t('members.result'), cell: (a) => <StatusBadge value={a.accessStatus} kind="access" /> },
    { key: 'source', header: t('members.source'), cell: (a) => a.source.replaceAll('_', ' ').toLowerCase() },
  ];
  return <DataTable columns={cols} rows={data?.data} rowKey={(a) => a._id} isLoading={isLoading} emptyLabel={t('members.noVisits')} />;
}

function NotesTab({ memberId }: { memberId: string }) {
  const { t } = useTranslation();
  const { data = [], isLoading } = useMemberNotes(memberId);
  const toast = useToast();
  const [body, setBody] = useState('');
  const add = useApiMutation(
    (b: string) => api.post(`/members/${memberId}/notes`, { body: b }).then((r) => r.data),
    [qk.memberNotes(memberId)],
    { onSuccess: () => { setBody(''); toast.success(t('members.noteAdded')); } },
  );

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <Textarea
          placeholder={t('members.notePlaceholder')}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="mt-2 flex justify-end">
          <Button size="sm" disabled={!body.trim() || add.isPending} onClick={() => add.mutate(body)}>
            {t('members.addNote')}
          </Button>
        </div>
      </Card>
      {isLoading && <p className="text-sm text-muted-foreground">{t('common.loading')}</p>}
      {data.map((n) => (
        <Card key={n._id} className="p-3">
          <p className="whitespace-pre-wrap text-sm">{n.body}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {n.createdByLabel} · {formatDateTime(n.createdAt)}
          </p>
        </Card>
      ))}
      {!isLoading && data.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('members.noNotes')}</p>
      )}
    </div>
  );
}

function QrDialog({
  memberId,
  memberCode,
  open,
  onClose,
}: {
  memberId: string;
  memberCode?: string;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const confirm = useConfirm();
  type Qr = {
    qrDataUrl: string;
    token: string;
    cardCode?: string | null;
    expiresAt?: string | null;
  };
  const [qr, setQr] = useState<Qr | null>(null);
  const [noQr, setNoQr] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cardCode, setCardCode] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async (regenerate = false) => {
    setLoading(true);
    setNoQr(false);
    try {
      const res = regenerate
        ? await unwrap<Qr>(api.post(`/members/${memberId}/qr/regenerate`, {}))
        : await unwrap<Qr>(api.get(`/members/${memberId}/qr`));
      setQr(res);
      if (regenerate) toast.success(t('members.qrRegenerated'));
    } catch (e) {
      if (apiStatus(e) === 404 || apiStatus(e) === 400) setNoQr(true);
      else toast.error(t('members.couldNotLoadQr'), apiError(e));
    } finally {
      setLoading(false);
    }
  };

  // Load the QR automatically the first time the dialog is opened.
  useEffect(() => {
    if (open && !qr && !loading && !noQr) void load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={() => {
        setQr(null);
        onClose();
      }}
      title={t('members.accessQr')}
      size="sm"
      footer={
        <>
          {qr && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                printQrCards(
                  [{ qrDataUrl: qr.qrDataUrl, code: qr.cardCode ?? memberCode }],
                  'IRON GYM · QR',
                )
              }
            >
              <Printer className="h-4 w-4" /> {t('common.print', 'Print')}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => load(true)} disabled={loading}>
            <RefreshCw className="h-4 w-4" /> {t('members.regenerate')}
          </Button>
        </>
      }
    >
      {!qr && !loading && !noQr && (
        <Button size="sm" onClick={() => load(false)}>
          {t('members.loadQr')}
        </Button>
      )}
      {loading && <Loader2 className="mx-auto h-6 w-6 animate-spin" />}
      {noQr && !loading && (
        <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
          {t('members.noActiveMembershipQr')}
        </p>
      )}
      {qr && (
        <div className="text-center">
          <img src={qr.qrDataUrl} alt={t('members.memberQr')} className="mx-auto w-56 rounded-md bg-white p-2" />
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t('members.enterCode', 'Code to enter at check-in')}
          </p>
          <p className="select-all font-mono text-lg font-bold tracking-[0.18em]">
            {qr.cardCode ?? memberCode ?? '—'}
          </p>
          {qr.expiresAt && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t('members.qrValidUntil', { date: formatDate(qr.expiresAt) })}
            </p>
          )}
        </div>
      )}

      <div className="mt-4 border-t border-border/60 pt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('members.assignCard')}
        </p>
        <div className="flex gap-2">
          <input
            dir="ltr"
            placeholder="CARD-000000"
            value={cardCode}
            onChange={(e) => setCardCode(e.target.value)}
            className="h-9 flex-1 rounded-md border border-input bg-surface px-3 font-mono text-sm outline-none focus:border-accent"
          />
          <Button
            size="sm"
            disabled={!cardCode.trim() || busy}
            onClick={async () => {
              const doAssign = async (replace: boolean) => {
                await api.post('/qr-cards/assign', {
                  cardCode: cardCode.trim(),
                  memberId,
                  replace,
                });
                setCardCode('');
                toast.success(t('members.cardAssigned'));
                load(false);
              };
              setBusy(true);
              try {
                await doAssign(false);
              } catch (e) {
                if (apiErrorIs(e, 'hasActiveQr')) {
                  const ok = await confirm({
                    title: t('members.replaceQrTitle', 'Replace QR'),
                    message: t(
                      'members.replaceQrConfirm',
                      'This member already has a QR. Replace it? The old one is removed.',
                    ),
                    confirmLabel: t('members.replaceQr', 'Replace'),
                    danger: true,
                  });
                  if (ok) {
                    try {
                      await doAssign(true);
                    } catch (e2) {
                      toast.error(apiError(e2));
                    }
                  }
                } else {
                  toast.error(apiError(e));
                }
              } finally {
                setBusy(false);
              }
            }}
          >
            {t('members.assignCardBtn')}
          </Button>
        </div>
        {(qr || !noQr) && (
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await api.post(`/members/${memberId}/qr/unassign`, {});
                setQr(null);
                setNoQr(true);
                toast.success(t('members.cardReleased'));
              } catch (e) {
                toast.error(apiError(e));
              } finally {
                setBusy(false);
              }
            }}
            className="mt-2 text-xs text-muted-foreground underline-offset-2 hover:text-danger hover:underline disabled:opacity-50"
          >
            {t('members.releaseCard')}
          </button>
        )}
      </div>
    </Dialog>
  );
}
