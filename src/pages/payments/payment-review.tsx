import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Card, PageHeader, Textarea, Field } from '@/components/ui/primitives';
import { DetailSkeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Dialog, ConfirmDialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { usePaymentAction, usePaymentDetail, qk } from '@/lib/api/hooks';
import { api, apiError } from '@/lib/api';
import type { MemberRow } from '@/lib/api/types';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import i18n from '@/i18n';

const OPEN_STATUSES = ['UNDER_REVIEW', 'PENDING'];

export function PaymentReviewPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const lng = i18n.language;
  const { data, isLoading, refetch } = usePaymentDetail(id);
  const runAction = usePaymentAction(id);

  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | 'approve' | 'cancel' | 'request-refund'>(null);
  const [reasonModal, setReasonModal] = useState<null | 'reject' | 'mark-fake'>(null);
  const [refundOpen, setRefundOpen] = useState(false);
  const [reason, setReason] = useState('');

  if (isLoading || !data) {
    return (
      <DetailSkeleton />
    );
  }

  const { payment, previousAttempts, auditHistory, signedProofUrl, signedRefundProofUrl } = data;
  const member = payment.member as MemberRow;
  const sub = typeof payment.subscription === 'object' ? payment.subscription : null;
  const isOpen = OPEN_STATUSES.includes(payment.status);
  const shortfall = payment.expectedAmount - payment.amount;

  const act = async (action: string, body?: unknown) => {
    setBusy(action);
    try {
      await runAction(action, body);
      toast.success(t('payments.actioned', { action: t(`statusLabel.${action.toUpperCase().replace('-', '_')}`, { defaultValue: action.replace('-', ' ') }) }));
      setConfirm(null);
      setReasonModal(null);
      setRefundOpen(false);
      setReason('');
      void refetch();
    } catch (e) {
      toast.error(t('members.actionFailed'), apiError(e));
    } finally {
      setBusy(null);
    }
  };

  const submitRefund = async (fd: FormData) => {
    setBusy('refund');
    try {
      await api.post(`/payments/${id}/refund`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['payments'] }),
        qc.invalidateQueries({ queryKey: qk.payment(id) }),
        qc.invalidateQueries({ queryKey: qk.dashboardSummary }),
      ]);
      toast.success(t('payments.actioned', { action: t('payments.recordRefund') }));
      setRefundOpen(false);
      void refetch();
    } catch (e) {
      toast.error(t('members.actionFailed'), apiError(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t('common.back')}
      </button>
      <PageHeader
        title={t('payments.review')}
        description={payment.receiptNumber || undefined}
        actions={<StatusBadge value={payment.status} kind="payment" />}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Proof */}
        <Card className="overflow-hidden">
          <div className="border-b border-border p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('payments.paymentProof')}
          </div>
          {signedProofUrl ? (
            <a href={signedProofUrl} target="_blank" rel="noreferrer" className="block bg-black/40">
              <img src={signedProofUrl} alt={t('payments.paymentProof')} className="mx-auto max-h-[560px] w-auto" />
            </a>
          ) : (
            <div className="p-10 text-center text-sm text-muted-foreground">
              {t('payments.noProof')} {payment.recordedManually && t('payments.manuallyRecorded')}
            </div>
          )}
          {signedProofUrl && (
            <a
              href={signedProofUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1 border-t border-border p-2 text-xs text-accent"
            >
              {t('payments.openFullSize')} <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </Card>

        {/* Details + actions */}
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('payments.member')}
            </h3>
            <p className="font-medium">
              {member?.user?.firstName} {member?.user?.lastName}
            </p>
            <p className="text-sm text-muted-foreground">{member?.memberCode}</p>
            <p className="mt-1 text-sm" dir="ltr">
              {member?.user?.phone}
            </p>
          </Card>

          <Card className="p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('payments.requestedSubscription')}
            </h3>
            <dl className="space-y-2 text-sm">
              <D k={t('payments.plan')} v={sub?.planNameEn ?? '—'} />
              <D k={t('payments.planPrice')} v={formatCurrency(sub?.finalPrice ?? 0, lng)} />
              <D k={t('payments.expectedNow')} v={formatCurrency(payment.expectedAmount, lng)} />
              <D
                k={t('payments.submittedAmount')}
                v={
                  <span className={shortfall > 0 ? 'text-warning' : 'text-success'}>
                    {formatCurrency(payment.amount, lng)}
                    {shortfall > 0 && ` (${t('payments.short', { amount: formatCurrency(shortfall, lng) })})`}
                  </span>
                }
              />
            </dl>
          </Card>

          <Card className="p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('payments.transferDetails')}
            </h3>
            <dl className="space-y-2 text-sm">
              <D k={t('payments.method')} v={payment.paymentMethodLabel || '—'} />
              <D k={t('payments.senderName')} v={payment.senderName || '—'} />
              <D k={t('payments.senderPhone')} v={<span dir="ltr">{payment.senderPhone || '—'}</span>} />
              <D
                k={t('payments.transferDate')}
                v={payment.transferDate ? formatDate(payment.transferDate) : '—'}
              />
              <D k={t('payments.reference')} v={payment.transactionReference || '—'} />
              <D k={t('payments.submitted')} v={formatDateTime(payment.createdAt)} />
            </dl>
            {payment.memberNotes && (
              <p className="mt-3 rounded-md bg-muted/50 p-2 text-xs">{payment.memberNotes}</p>
            )}
          </Card>

          {isOpen && (
            <Card className="space-y-2 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('payments.decision')}
              </h3>
              <Button className="w-full" onClick={() => setConfirm('approve')} disabled={!!busy}>
                {t('payments.approve')}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setReasonModal('reject')}
                disabled={!!busy}
              >
                {t('payments.reject')}
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReasonModal('mark-fake')}
                  disabled={!!busy}
                >
                  {t('payments.markFake')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirm('cancel')}
                  disabled={!!busy}
                >
                  {t('payments.cancel')}
                </Button>
              </div>
            </Card>
          )}

          {payment.status === 'APPROVED' && (
            <Card className="space-y-2 p-4">
              <Button
                variant="outline"
                className="w-full"
                size="sm"
                onClick={() => setConfirm('request-refund')}
                disabled={!!busy}
              >
                {t('payments.requestRefund')}
              </Button>
              <Button
                variant="danger"
                className="w-full"
                size="sm"
                onClick={() => setRefundOpen(true)}
                disabled={!!busy}
              >
                {t('payments.recordRefund')}
              </Button>
            </Card>
          )}
          {payment.status === 'REFUND_REQUESTED' && (
            <Button variant="danger" className="w-full" onClick={() => setRefundOpen(true)}>
              {t('payments.recordRefund')}
            </Button>
          )}

          {payment.rejectionReason && (
            <Card className="p-3 text-sm">
              <span className="text-xs text-muted-foreground">{t('payments.rejectionReason')}</span>
              <p>{payment.rejectionReason}</p>
            </Card>
          )}

          {signedRefundProofUrl && (
            <Card className="overflow-hidden">
              <div className="border-b border-border p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('payments.refundProof')}
              </div>
              <a
                href={signedRefundProofUrl}
                target="_blank"
                rel="noreferrer"
                className="block bg-black/40"
              >
                <img
                  src={signedRefundProofUrl}
                  alt={t('payments.refundProof')}
                  className="mx-auto max-h-[320px] w-auto"
                />
              </a>
            </Card>
          )}
        </div>
      </div>

      {/* Previous attempts + audit */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('payments.previousAttempts')}
          </h3>
          {previousAttempts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('payments.none')}</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {previousAttempts.map((a) => (
                <li key={a._id} className="flex items-center justify-between border-b border-border/50 pb-2">
                  <span>
                    {formatCurrency(a.amount, lng)} ·{' '}
                    {formatDate(a.createdAt)}
                  </span>
                  <StatusBadge value={a.status} kind="payment" />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('payments.auditHistory')}
          </h3>
          {auditHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('payments.noAuditEntries')}</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {auditHistory.map((h) => (
                <li key={h._id} className="border-b border-border/50 pb-2">
                  <span className="font-medium">{h.action.replaceAll('_', ' ').toLowerCase()}</span>
                  <span className="text-muted-foreground">
                    {' '}
                    — {h.userLabel || (h.user ? `${h.user.firstName} ${h.user.lastName}` : 'system')} ·{' '}
                    {formatDateTime(h.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Dialogs */}
      <ConfirmDialog
        open={confirm === 'approve'}
        onClose={() => setConfirm(null)}
        onConfirm={() => act('approve')}
        title={t('payments.approveTitle')}
        message={t('payments.approveMsg')}
        confirmLabel={t('payments.approve')}
        loading={busy === 'approve'}
      />
      <ConfirmDialog
        open={confirm === 'cancel'}
        onClose={() => setConfirm(null)}
        onConfirm={() => act('cancel')}
        title={t('payments.cancelTitle')}
        message={t('payments.cancelMsg')}
        confirmLabel={t('payments.cancelConfirm')}
        tone="danger"
        loading={busy === 'cancel'}
      />
      <ConfirmDialog
        open={confirm === 'request-refund'}
        onClose={() => setConfirm(null)}
        onConfirm={() => act('request-refund')}
        title={t('payments.requestRefundTitle')}
        message={t('payments.requestRefundMsg')}
        confirmLabel={t('payments.request')}
        loading={busy === 'request-refund'}
      />

      <Dialog
        open={reasonModal !== null}
        onClose={() => setReasonModal(null)}
        title={reasonModal === 'reject' ? t('payments.rejectPayment') : t('payments.markAsFake')}
        description={
          reasonModal === 'reject'
            ? t('payments.rejectHint')
            : t('payments.fakeHint')
        }
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setReasonModal(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              disabled={reason.trim().length < 3 || !!busy}
              onClick={() =>
                act(reasonModal === 'reject' ? 'reject' : 'mark-fake', {
                  [reasonModal === 'reject' ? 'reason' : 'internalReason']: reason,
                })
              }
            >
              {reasonModal === 'reject' ? t('payments.reject') : t('payments.markFake')}
            </Button>
          </>
        }
      >
        <Textarea
          placeholder={t('payments.reasonPlaceholder')}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Dialog>

      <RefundDialog open={refundOpen} onClose={() => setRefundOpen(false)} max={payment.amount} onSubmit={submitRefund} busy={busy === 'refund'} />
    </div>
  );
}

function D({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-end font-medium">{v}</dd>
    </div>
  );
}

function RefundDialog({
  open,
  onClose,
  max,
  onSubmit,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  max: number;
  onSubmit: (body: FormData) => void;
  busy: boolean;
}) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState(String(max));
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [proof, setProof] = useState<File | null>(null);

  const submit = () => {
    const fd = new FormData();
    fd.append('amount', String(Number(amount)));
    fd.append('date', date);
    fd.append('method', method);
    if (reference) fd.append('reference', reference);
    if (note) fd.append('note', note);
    if (proof) fd.append('proof', proof);
    onSubmit(fd);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('payments.recordRefundTitle')}
      description={t('payments.recordRefundHint')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            disabled={busy || !method.trim() || Number(amount) <= 0}
            onClick={submit}
          >
            {t('payments.recordRefund')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label={t('payments.amountMax', { max })}>
          <input
            type="number"
            className="h-10 w-full rounded-md border border-input bg-surface px-3 text-sm"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label={t('payments.refundDate')}>
          <input
            type="date"
            className="h-10 w-full rounded-md border border-input bg-surface px-3 text-sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Field label={t('payments.method')}>
          <input
            className="h-10 w-full rounded-md border border-input bg-surface px-3 text-sm"
            placeholder={t('payments.methodPlaceholder')}
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          />
        </Field>
        <Field label={`${t('payments.reference')} (${t('common.optional')})`}>
          <input
            className="h-10 w-full rounded-md border border-input bg-surface px-3 text-sm"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </Field>
        <Field label={`${t('payments.note')} (${t('common.optional')})`}>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Field label={`${t('payments.refundProof')} (${t('common.optional')})`}>
          <input
            type="file"
            accept="image/*"
            className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:text-foreground hover:file:bg-muted/70"
            onChange={(e) => setProof(e.target.files?.[0] ?? null)}
          />
          <p className="mt-1 text-xs text-muted-foreground">{t('payments.refundProofHint')}</p>
        </Field>
      </div>
    </Dialog>
  );
}
