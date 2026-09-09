import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Layers,
  Receipt,
  ScanLine,
  CalendarCheck,
  Bell,
  MessageCircle,
  BarChart3,
  Globe,
  Image,
  Building2,
  UserCog,
  ShieldCheck,
  ScrollText,
  Settings,
  LogOut,
  Menu,
  Dumbbell,
  PanelLeftClose,
  PanelLeftOpen,
  QrCode,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import i18n from '@/i18n';

const NAV_GROUPS = [
  {
    label: 'operations',
    items: [
      { to: '/', key: 'dashboard', icon: LayoutDashboard },
      { to: '/members', key: 'members', icon: Users },
      { to: '/subscriptions', key: 'subscriptions', icon: Layers },
      { to: '/plans', key: 'plans', icon: CreditCard },
      { to: '/payments', key: 'payments', icon: Receipt },
      { to: '/check-in', key: 'checkin', icon: ScanLine },
      { to: '/qr-cards', key: 'qrcards', icon: QrCode },
      { to: '/attendance', key: 'attendance', icon: CalendarCheck },
    ],
  },
  {
    label: 'engagement',
    items: [
      { to: '/notifications', key: 'notifications', icon: Bell },
      { to: '/whatsapp', key: 'whatsapp', icon: MessageCircle },
      { to: '/reports', key: 'reports', icon: BarChart3 },
      { to: '/website', key: 'website', icon: Globe },
      { to: '/media', key: 'media', icon: Image },
    ],
  },
  {
    label: 'settings',
    items: [
      { to: '/branches', key: 'branches', icon: Building2 },
      { to: '/staff', key: 'staff', icon: UserCog },
      { to: '/roles', key: 'roles', icon: ShieldCheck },
      { to: '/audit', key: 'audit', icon: ScrollText },
      { to: '/settings', key: 'settings', icon: Settings },
    ],
  },
] as const;

const COLLAPSE_KEY = 'iron_gym_sidebar_collapsed';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const toggleLang = () => i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar');
  const toggleCollapsed = () =>
    setCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });

  const showText = !collapsed;

  return (
    <div className="flex min-h-dvh bg-background">
      <AnimatePresence>
        {open && (
          <motion.button
            aria-label="Close navigation"
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          'fixed inset-y-0 z-40 flex w-64 flex-col overflow-hidden border-e border-border bg-surface transition-[transform,width] duration-300 ease-out lg:static lg:z-auto lg:translate-x-0',
          open ? 'translate-x-0' : 'max-lg:ltr:-translate-x-full max-lg:rtl:translate-x-full',
          collapsed ? 'lg:w-16' : 'lg:w-64',
        )}
      >
        <div
          className={cn(
            'flex h-14 shrink-0 items-center border-b border-border',
            collapsed ? 'justify-center px-2' : 'gap-2.5 px-4',
          )}
        >
          {!collapsed && (
            <>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                <Dumbbell className="h-4 w-4" />
              </span>
              <span className="flex-1 truncate font-display text-lg font-bold uppercase tracking-tight">
                {t('app.name')}
              </span>
            </>
          )}
          <button
            onClick={toggleCollapsed}
            className="hidden rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:block"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? t('app.name') : undefined}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto overflow-x-hidden p-3">
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.label}>
              {showText && (
                <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
                  {t(`nav.groups.${group.label}`, group.label)}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map(({ to, key, icon: Icon }, i) => (
                  <motion.div
                    key={to}
                    initial={{ opacity: 0, x: i18n.language === 'ar' ? 10 : -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: 0.03 * (gi * 5 + i),
                      duration: 0.3,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    <NavLink
                      to={to}
                      end={to === '/'}
                      onClick={() => setOpen(false)}
                      title={collapsed ? t(`nav.${key}`) : undefined}
                      className={({ isActive }) =>
                        cn(
                          'group relative flex items-center gap-3 rounded-md py-2 text-sm font-medium transition-colors',
                          collapsed ? 'justify-center px-2' : 'px-3',
                          isActive
                            ? 'bg-accent/10 text-accent'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={cn(
                              'absolute inset-y-1.5 start-0 w-0.5 rounded-full bg-accent transition-opacity',
                              isActive ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          <Icon
                            className={cn(
                              'h-4 w-4 shrink-0 transition-transform group-hover:scale-110',
                              isActive && 'text-accent',
                            )}
                          />
                          {showText && <span className="truncate">{t(`nav.${key}`)}</span>}
                        </>
                      )}
                    </NavLink>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-border p-3">
          <div
            className={cn(
              'flex items-center gap-3 rounded-md py-2 text-sm',
              collapsed ? 'justify-center px-1' : 'px-3',
            )}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 font-display text-xs font-bold uppercase text-accent">
              {(user?.fullName ?? '?').slice(0, 2)}
            </span>
            {showText && (
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{user?.fullName}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur">
          <button
            className="rounded-md p-2 hover:bg-muted lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="ms-auto flex items-center gap-3 text-sm">
            <button
              onClick={toggleLang}
              className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold uppercase transition-colors hover:bg-muted"
            >
              {i18n.language === 'ar' ? 'EN' : 'ع'}
            </button>
            <span className="hidden text-muted-foreground sm:inline">
              {t('common.signedInAs')} <span className="text-foreground">{user?.fullName}</span>
            </span>
            <button
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t('common.logout')}</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden p-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
