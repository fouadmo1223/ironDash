import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { api, unwrap, apiError, type ApiEnvelope } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import type {
  AccessResult,
  AttendanceRow,
  BranchRow,
  Page,
  PaymentDetail,
  PaymentRow,
  PlanRow,
  RoleRow,
  StaffRow,
  SubscriptionRow,
} from './types';

const qk = {
  dashboardSummary: ['dashboard', 'summary'] as const,
  actionCenter: ['dashboard', 'action-center'] as const,
  members: (p: Record<string, unknown>) => ['members', p] as const,
  member: (id: string) => ['members', id] as const,
  memberNotes: (id: string) => ['members', id, 'notes'] as const,
  plans: ['plans'] as const,
  subscriptions: (p: Record<string, unknown>) => ['subscriptions', p] as const,
  payments: (p: Record<string, unknown>) => ['payments', p] as const,
  payment: (id: string) => ['payments', id] as const,
  attendance: (p: Record<string, unknown>) => ['attendance', p] as const,
  branches: ['branches'] as const,
  roles: ['roles'] as const,
  staff: (p: Record<string, unknown>) => ['staff', p] as const,
  whatsappTemplates: ['whatsapp', 'templates'] as const,
  cmsPages: ['cms', 'pages'] as const,
  cmsPage: (slug: string) => ['cms', 'pages', slug] as const,
  cmsSite: ['cms', 'site'] as const,
  settings: ['settings'] as const,
  audit: (p: Record<string, unknown>) => ['audit', p] as const,
};

// ─────────────────────────── Dashboard ───────────────────────────

export function useDashboardSummary() {
  return useQuery({
    queryKey: qk.dashboardSummary,
    queryFn: () => unwrap<Record<string, number>>(api.get('/dashboard/summary')),
  });
}

export function useActionCenter() {
  return useQuery({
    queryKey: qk.actionCenter,
    queryFn: () =>
      unwrap<Array<{ key: string; count: number; href: string }>>(
        api.get('/dashboard/action-center'),
      ),
  });
}

export function useReport<T = unknown>(path: string, params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ['reports', path, params],
    queryFn: () => unwrap<T>(api.get(`/reports/${path}`, { params })),
  });
}

// ─────────────────────────── Members ───────────────────────────

export function useMembers(params: Record<string, unknown>) {
  return useQuery({
    queryKey: qk.members(params),
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<unknown[]>>('/members', { params });
      return { data: res.data.data, meta: res.data.meta } as Page<import('./types').MemberRow>;
    },
  });
}

export function useMember(id: string) {
  return useQuery({
    queryKey: qk.member(id),
    queryFn: () => unwrap<import('./types').MemberRow>(api.get(`/members/${id}`)),
    enabled: !!id,
  });
}

export function useMemberNotes(id: string) {
  return useQuery({
    queryKey: qk.memberNotes(id),
    queryFn: () =>
      unwrap<Array<{ _id: string; body: string; pinned: boolean; createdByLabel: string; createdAt: string }>>(
        api.get(`/members/${id}/notes`),
      ),
    enabled: !!id,
  });
}

export function useMemberSubscriptions(memberId: string) {
  return useQuery({
    queryKey: ['subscriptions', 'member', memberId],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<SubscriptionRow[]>>('/subscriptions', {
        params: { memberId, limit: 50 },
      });
      return res.data.data;
    },
    enabled: !!memberId,
  });
}

// ─────────────────────────── Plans ───────────────────────────

export function usePlans() {
  return useQuery({
    queryKey: qk.plans,
    queryFn: () => unwrap<PlanRow[]>(api.get('/subscription-plans')),
  });
}

// ─────────────────────────── Subscriptions ───────────────────────────

export function useSubscriptions(params: Record<string, unknown>) {
  return useQuery({
    queryKey: qk.subscriptions(params),
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<SubscriptionRow[]>>('/subscriptions', { params });
      return { data: res.data.data, meta: res.data.meta } as Page<SubscriptionRow>;
    },
  });
}

// ─────────────────────────── Payments ───────────────────────────

export function usePayments(params: Record<string, unknown>) {
  return useQuery({
    queryKey: qk.payments(params),
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<PaymentRow[]>>('/payments', { params });
      return { data: res.data.data, meta: res.data.meta } as Page<PaymentRow>;
    },
  });
}

export function usePaymentDetail(id: string) {
  return useQuery({
    queryKey: qk.payment(id),
    queryFn: () => unwrap<PaymentDetail>(api.get(`/payments/${id}`)),
    enabled: !!id,
  });
}

export function usePaymentAction(id: string) {
  const qc = useQueryClient();
  return (action: string, body?: unknown) =>
    api.post(`/payments/${id}/${action}`, body ?? {}).then((r) => {
      void qc.invalidateQueries({ queryKey: ['payments'] });
      void qc.invalidateQueries({ queryKey: qk.payment(id) });
      void qc.invalidateQueries({ queryKey: qk.dashboardSummary });
      return r.data;
    });
}

// ─────────────────────────── Attendance ───────────────────────────

export function useAttendance(params: Record<string, unknown>) {
  return useQuery({
    queryKey: qk.attendance(params),
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<AttendanceRow[]>>('/attendance', { params });
      return { data: res.data.data, meta: res.data.meta } as Page<AttendanceRow>;
    },
  });
}

export function useScan() {
  return useMutation({
    mutationFn: (body: { token: string; branchId?: string; source?: string }) =>
      unwrap<AccessResult>(api.post('/access/scan', body)),
  });
}

// ─────────────────────────── Branches / Roles / Staff ───────────────────────────

export function useBranches() {
  return useQuery({ queryKey: qk.branches, queryFn: () => unwrap<BranchRow[]>(api.get('/branches')) });
}

export function useRoles() {
  return useQuery({ queryKey: qk.roles, queryFn: () => unwrap<RoleRow[]>(api.get('/roles')) });
}

export function useStaff(params: Record<string, unknown>) {
  return useQuery({
    queryKey: qk.staff(params),
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<StaffRow[]>>('/staff', { params });
      return { data: res.data.data, meta: res.data.meta } as Page<StaffRow>;
    },
  });
}

// ─────────────────────────── WhatsApp ───────────────────────────

export function useWhatsAppTemplates() {
  return useQuery({
    queryKey: qk.whatsappTemplates,
    queryFn: () =>
      unwrap<Array<{ _id: string; key: string; nameEn: string; nameAr: string; bodyEn: string; bodyAr: string; isActive: boolean }>>(
        api.get('/whatsapp/templates'),
      ),
  });
}

// ─────────────────────────── CMS ───────────────────────────

export function useCmsPages() {
  return useQuery({
    queryKey: qk.cmsPages,
    queryFn: () =>
      unwrap<Array<{ slug: string; nameEn: string; nameAr: string; isPublished: boolean; updatedAt: string }>>(
        api.get('/cms/pages'),
      ),
  });
}

export function useCmsPage(slug: string) {
  return useQuery({
    queryKey: qk.cmsPage(slug),
    queryFn: () => unwrap<Record<string, unknown>>(api.get(`/cms/pages/${slug}`)),
    enabled: !!slug,
  });
}

export function useCmsSite() {
  return useQuery({
    queryKey: qk.cmsSite,
    queryFn: () => unwrap<Record<string, unknown>>(api.get('/cms/site')),
  });
}

// ─────────────────────────── Settings / Audit ───────────────────────────

export function useSettings() {
  return useQuery({
    queryKey: qk.settings,
    queryFn: () =>
      unwrap<Array<{ _id: string; key: string; value: unknown; group: string; isPublic: boolean }>>(
        api.get('/settings'),
      ),
  });
}

export function useAudit(params: Record<string, unknown>) {
  return useQuery({
    queryKey: qk.audit(params),
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<Record<string, unknown>[]>>('/audit-logs', { params });
      return { data: res.data.data, meta: res.data.meta } as Page<Record<string, unknown>>;
    },
  });
}

// ─────────────────────────── Generic mutation helper ───────────────────────────

export function useApiMutation<TData, TVars>(
  fn: (vars: TVars) => Promise<TData>,
  invalidate: (readonly unknown[])[] = [],
  options?: UseMutationOptions<TData, unknown, TVars>,
) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: fn,
    ...options,
    onSuccess: (data, vars, ctx) => {
      invalidate.forEach((key) => void qc.invalidateQueries({ queryKey: key }));
      (options?.onSuccess as ((d: TData, v: TVars, c: unknown) => void) | undefined)?.(
        data,
        vars,
        ctx,
      );
    },
    onError: (error, vars, ctx) => {
      // Callers that pass their own onError opt out of the default toast.
      if (options?.onError) {
        (options.onError as (e: unknown, v: TVars, c: unknown) => void)(error, vars, ctx);
      } else {
        toast.error(apiError(error));
      }
    },
  });
}

export { qk };
