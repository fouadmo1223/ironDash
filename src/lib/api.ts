import axios, { AxiosError, type AxiosInstance } from 'axios';
import i18n from '@/i18n';

/** Known (English) backend messages → localised keys under `apiErrors`. */
const API_ERROR_PATTERNS: Array<[RegExp, string]> = [
  [/already has an active qr/i, 'hasActiveQr'],
  [/no active subscription|only be assigned to an active member/i, 'noActiveSub'],
  [/not in the pool|already assigned, or unknown/i, 'cardNotInPool'],
  [/invalid value for/i, 'invalidValue'],
  [/account with this email already exists/i, 'emailExists'],
  [/invalid email or password/i, 'invalidCredentials'],
  [/account is disabled/i, 'accountDisabled'],
  [/not found/i, 'notFound'],
  [/missing permission|staff access required|not available for your account type/i, 'forbidden'],
  [/too many requests|throttl/i, 'rateLimited'],
  [/validation failed/i, 'validation'],
];

/** True when the backend error message matches a known `apiErrors` key. */
export function apiErrorIs(error: unknown, key: string): boolean {
  if (!axios.isAxiosError(error)) return false;
  const raw = String((error.response?.data as { message?: string } | undefined)?.message ?? '');
  return API_ERROR_PATTERNS.some(([re, k]) => k === key && re.test(raw));
}

function localiseApiMessage(raw: string): string {
  for (const [re, key] of API_ERROR_PATTERNS) {
    if (re.test(raw)) {
      const translated = i18n.t(`apiErrors.${key}`);
      if (translated && translated !== `apiErrors.${key}`) return translated;
    }
  }
  return raw;
}

const BASE_URL = (import.meta.env.VITE_API_URL as string) ?? 'http://localhost:4000/api/v1';

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: { page: number; limit: number; total: number; pages: number };
}

const ACCESS_KEY = 'iron_gym_dash_access';
const REFRESH_KEY = 'iron_gym_dash_refresh';

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = tokenStore.access;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const refresh = tokenStore.refresh;
  if (!refresh) return null;
  try {
    const { data } = await axios.post<ApiEnvelope<{ accessToken: string; refreshToken: string }>>(
      `${BASE_URL}/auth/refresh`,
      { refreshToken: refresh },
    );
    tokenStore.set(data.data.accessToken, data.data.refreshToken);
    return data.data.accessToken;
  } catch {
    tokenStore.clear();
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (typeof error.config & { _retried?: boolean }) | undefined;
    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true;
      refreshing ??= doRefresh().finally(() => {
        refreshing = null;
      });
      const token = await refreshing;
      if (token) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${token}`;
        return api.request(original);
      }
      if (typeof window !== 'undefined' && !window.location.pathname.endsWith('/login')) {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  },
);

export function unwrap<T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  return promise.then((r) => r.data.data);
}

/** HTTP status of a failed request, or 0 when there was no response. */
export function apiStatus(error: unknown): number {
  return axios.isAxiosError(error) ? (error.response?.status ?? 0) : 0;
}

export function apiError(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined;
    const msg = data?.message;
    if (Array.isArray(msg)) return msg.map(localiseApiMessage).join('\n');
    if (!error.response) {
      const net = i18n.t('apiErrors.network');
      return net && net !== 'apiErrors.network' ? net : 'Network error — the server is unreachable.';
    }
    return msg ? localiseApiMessage(msg) : error.message ?? fallback;
  }
  return fallback;
}

/** Backend success envelopes carry a human `message`; surface it in toasts. */
export function apiMessage(data: unknown, fallback = ''): string {
  if (data && typeof data === 'object' && 'message' in data && typeof (data as { message: unknown }).message === 'string') {
    return (data as { message: string }).message;
  }
  return fallback;
}
