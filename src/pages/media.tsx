import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Trash2, Upload } from 'lucide-react';
import { PageHeader, Card, Input } from '@/components/ui/primitives';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';

interface Asset {
  _id: string;
  secureUrl: string;
  title: string;
  altEn: string;
  width: number;
  height: number;
  usedBy: string[];
}

export function MediaPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    api
      .get('/media', { params: { search: search || undefined, limit: 60 } })
      .then((r) => setAssets(r.data.data))
      .catch(() => setAssets([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, [search]);

  const upload = async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    try {
      await api.post('/media/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(t('media.uploaded'));
      load();
    } catch {
      toast.error(t('media.uploadFailed'), t('media.uploadFailedHint'));
    }
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`/media/${id}`);
      toast.success(t('media.deleted'));
      load();
    } catch {
      toast.error(t('media.cannotDelete'), t('media.cannotDeleteHint'));
    }
  };

  return (
    <div>
      <PageHeader
        title={t('media.title')}
        actions={
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
            <Button size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> {t('media.upload')}
            </Button>
          </>
        }
      />
      <Input
        className="mb-4 max-w-sm"
        placeholder={t('media.search')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {loading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 15 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {assets.map((a) => (
          <Card key={a._id} className="overflow-hidden">
            <div className="aspect-square bg-black/30">
              <img src={a.secureUrl} alt={a.altEn} className="h-full w-full object-cover" />
            </div>
            <div className="p-2">
              <p className="truncate text-xs">{a.title}</p>
              <div className="mt-1 flex gap-1">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(a.secureUrl);
                    toast.success(t('media.urlCopied'));
                  }}
                  className="rounded p-1 text-muted-foreground hover:bg-muted"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => remove(a._id)}
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {!loading && assets.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('media.empty')}</p>
      )}
    </div>
  );
}
