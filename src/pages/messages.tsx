import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Phone, User, Archive } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { PageHeader, Input } from '@/components/ui/primitives';
import { DataTable, Pagination, type Column } from '@/components/ui/data-table';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { useToast } from '@/components/ui/toast';
import { api, apiError } from '@/lib/api';

interface MessageRow {
  _id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: 'NEW' | 'READ' | 'ARCHIVED';
  ipAddress?: string;
  userAgent?: string;
  readAt?: string | null;
  createdAt: string;
}

type Page = { data: MessageRow[]; meta: { page: number; pages: number; total: number } };

export function MessagesPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MessageRow | null>(null);

  const params = useMemo(
    () => ({ page, limit: 20, ...(search ? { search } : {}), ...(status ? { status } : {}) }),
    [page, search, status],
  );

  const load = () => {
    setLoading(true);
    api
      .get<{ data: MessageRow[]; meta: Page['meta'] }>('/contact-messages', { params })
      .then((r) => setData({ data: r.data.data, meta: r.data.meta }))
      .catch(() => setData({ data: [], meta: { page: 1, pages: 1, total: 0 } }))
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [page, search, status]);

  const open = async (row: MessageRow) => {
    setSelected(row);
    if (row.status === 'NEW') {
      try {
        await api.patch(`/contact-messages/${row._id}/read`);
        setData((d) =>
          d ? { ...d, data: d.data.map((m) => (m._id === row._id ? { ...m, status: 'READ' } : m)) } : d,
        );
      } catch {
        /* ignore */
      }
    }
  };

  const archive = async (id: string) => {
    try {
      await api.patch(`/contact-messages/${id}/archive`);
      toast.success(t('messages.archived', 'Archived'));
      setSelected(null);
      load();
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const cols: Column<MessageRow>[] = [
    {
      key: 'from',
      header: t('messages.from', 'From'),
      cell: (m) => (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-medium">
            {m.status === 'NEW' && <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />}
            {m.name}
          </div>
          <div className="truncate text-xs text-muted-foreground">{m.email}</div>
        </div>
      ),
    },
    { key: 'phone', header: t('messages.phone', 'Phone'), cell: (m) => <span dir="ltr">{m.phone}</span> },
    {
      key: 'message',
      header: t('messages.message', 'Message'),
      cell: (m) => <span className="line-clamp-1 text-muted-foreground">{m.message}</span>,
    },
    {
      key: 'status',
      header: t('messages.status', 'Status'),
      cell: (m) => <StatusBadge value={m.status} label={m.status.toLowerCase()} kind="generic" />,
    },
    { key: 'date', header: t('messages.date', 'Received'), cell: (m) => formatDateTime(m.createdAt) },
  ];

  return (
    <div>
      <PageHeader title={t('messages.title', 'Messages')} description={t('messages.desc', 'Enquiries from the website contact form.')} />
      <div className="mb-3 flex flex-wrap gap-2">
        <Input
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          placeholder={t('messages.search', 'Search name, email, phone…')}
          className="max-w-xs"
        />
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          className="h-9 rounded-md border border-input bg-surface px-2 text-sm"
        >
          <option value="">{t('messages.allStatuses', 'All')}</option>
          <option value="NEW">{t('messages.new', 'New')}</option>
          <option value="READ">{t('messages.read', 'Read')}</option>
          <option value="ARCHIVED">{t('messages.archivedStatus', 'Archived')}</option>
        </select>
      </div>

      <DataTable
        columns={cols}
        rows={data?.data}
        rowKey={(m) => m._id}
        isLoading={loading}
        onRowClick={open}
        emptyLabel={t('messages.empty', 'No messages yet.')}
        dense
      />
      {data && (
        <Pagination page={data.meta.page} pages={data.meta.pages} total={data.meta.total} onPage={setPage} />
      )}

      <Dialog
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ''}
        size="md"
        footer={
          selected && selected.status !== 'ARCHIVED' ? (
            <Button variant="outline" size="sm" onClick={() => archive(selected._id)}>
              <Archive className="h-4 w-4" /> {t('messages.archive', 'Archive')}
            </Button>
          ) : null
        }
      >
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <Field icon={User} label={t('messages.name', 'Name')} value={selected.name} />
              <Field
                icon={Mail}
                label={t('messages.email', 'Email')}
                value={<a href={`mailto:${selected.email}`} className="text-accent hover:underline" dir="ltr">{selected.email}</a>}
              />
              <Field
                icon={Phone}
                label={t('messages.phone', 'Phone')}
                value={<a href={`tel:${selected.phone.replace(/[^\d+]/g, '')}`} className="text-accent hover:underline" dir="ltr">{selected.phone}</a>}
              />
              <Field label={t('messages.date', 'Received')} value={formatDateTime(selected.createdAt)} />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('messages.message', 'Message')}
              </p>
              <p className="whitespace-pre-wrap rounded-md border border-border/60 bg-surface/60 p-3">
                {selected.message}
              </p>
            </div>
            {(selected.ipAddress || selected.userAgent) && (
              <p className="text-xs text-muted-foreground">
                {selected.ipAddress} · {selected.userAgent}
              </p>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof User;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </p>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  );
}
