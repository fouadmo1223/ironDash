import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, tokenStore, unwrap } from './api';

export interface StaffPrincipal {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  accountType: 'STAFF' | 'MEMBER';
  language: string;
  roleKey?: string | null;
}

interface AuthContextValue {
  user: StaffPrincipal | null;
  permissions: string[];
  roleKey: string | null;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  can: (permission: string) => boolean;
}

/** Roles that get the full dashboard (engagement + settings groups). */
const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ADMIN']);

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StaffPrincipal | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    if (!tokenStore.access) {
      setLoading(false);
      return;
    }
    try {
      const me = await unwrap<StaffPrincipal & { permissions?: string[] }>(api.get('/auth/me'));
      setUser(me);
      setPermissions(me.permissions ?? []);
    } catch {
      tokenStore.clear();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await unwrap<{
      tokens: { accessToken: string; refreshToken: string };
      user: StaffPrincipal;
    }>(api.post('/auth/login', { email, password }));
    tokenStore.set(res.tokens.accessToken, res.tokens.refreshToken);
    setUser(res.user);
    await loadMe();
  }, [loadMe]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout', { refreshToken: tokenStore.refresh });
    } catch {
      /* ignore */
    }
    tokenStore.clear();
    setUser(null);
    setPermissions([]);
  }, []);

  const can = useCallback(
    (permission: string) => permissions.includes(permission),
    [permissions],
  );

  const roleKey = user?.roleKey ?? null;
  const isAdmin = !!roleKey && ADMIN_ROLES.has(roleKey);

  const value = useMemo(
    () => ({ user, permissions, roleKey, isAdmin, loading, login, logout, can }),
    [user, permissions, roleKey, isAdmin, loading, login, logout, can],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
