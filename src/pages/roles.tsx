import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { PageHeader, Card } from '@/components/ui/primitives';
import { CardsSkeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { useRoles, useApiMutation, qk } from '@/lib/api/hooks';
import { api, unwrap } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { RoleRow } from '@/lib/api/types';

export function RolesPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const { data: roles = [], isLoading } = useRoles();
  const [editing, setEditing] = useState<RoleRow | null>(null);
  const [catalog, setCatalog] = useState<string[]>([]);

  useEffect(() => {
    unwrap<string[]>(api.get('/roles/permissions/catalog'))
      .then(setCatalog)
      .catch(() => setCatalog([]));
  }, []);

  return (
    <div>
      <PageHeader title={t('roles.title')} />
      {isLoading && <CardsSkeleton count={6} lines={2} />}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {roles.map((r) => (
          <Card key={r._id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-lg font-bold uppercase">{r.nameEn}</h3>
                <p className="text-xs text-muted-foreground">{r.key}</p>
              </div>
              {r.isSystem && <StatusBadge value="SYSTEM" label="system" kind="generic" />}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {t('roles.permissionsCount', { count: r.permissions.length })}
            </p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setEditing(r)}>
              {t('roles.editPermissions')}
            </Button>
          </Card>
        ))}
      </div>

      {editing && (
        <PermissionsDialog
          role={editing}
          catalog={catalog}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            toast.success(t('roles.updated'));
          }}
        />
      )}
    </div>
  );
}

function PermissionsDialog({
  role,
  catalog,
  onClose,
  onSaved,
}: {
  role: RoleRow;
  catalog: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Set<string>>(new Set(role.permissions));
  const groups = useMemo(() => {
    const g: Record<string, string[]> = {};
    catalog.forEach((p) => {
      const key = p.split('.')[0];
      (g[key] ??= []).push(p);
    });
    return g;
  }, [catalog]);

  const save = useApiMutation(
    () => api.patch(`/roles/${role._id}`, { permissions: [...selected] }),
    [qk.roles],
    { onSuccess: onSaved },
  );

  const toggle = (p: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(p) ? n.delete(p) : n.add(p);
      return n;
    });

  const toggleGroup = (perms: string[], on: boolean) =>
    setSelected((s) => {
      const n = new Set(s);
      perms.forEach((p) => (on ? n.add(p) : n.delete(p)));
      return n;
    });

  const totalOn = selected.size;
  const total = catalog.length;

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('roles.permissionsTitle', { name: role.nameEn })}
      description={`${totalOn} / ${total}`}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => save.mutate(undefined)} disabled={save.isPending}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {Object.entries(groups).map(([group, perms]) => {
          const on = perms.filter((p) => selected.has(p)).length;
          const allOn = on === perms.length;
          return (
            <div key={group} className="rounded-lg border border-border bg-surface-raised/40">
              <div className="flex items-center justify-between gap-3 border-b border-border/60 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">
                    {t(`permGroup.${group}`, { defaultValue: group })}
                  </span>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    {on}/{perms.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleGroup(perms, !allOn)}
                  className={cn(
                    'rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors',
                    allOn
                      ? 'bg-accent/15 text-accent'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {t('roles.selectAll')}
                </button>
              </div>
              <div className="flex flex-wrap gap-2 p-3">
                {perms.map((p) => {
                  const active = selected.has(p);
                  const action = p.split('.')[1];
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => toggle(p)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                        active
                          ? 'border-accent/50 bg-accent/15 text-accent'
                          : 'border-border bg-surface text-muted-foreground hover:border-border hover:text-foreground',
                      )}
                    >
                      <Check
                        className={cn('h-3.5 w-3.5', active ? 'opacity-100' : 'opacity-0')}
                      />
                      {t(`permAction.${action}`, { defaultValue: action.replaceAll('_', ' ') })}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Dialog>
  );
}
