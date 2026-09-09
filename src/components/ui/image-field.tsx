import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';

/**
 * Upload-only image picker. Sends the file to Cloudinary via `POST /media/upload`
 * and stores the returned `secureUrl` as the field value — no manual URLs.
 */
export function ImageField({
  value,
  onChange,
  className,
}: {
  value?: string;
  onChange: (url: string) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file: File) => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/media/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url: string | undefined = data?.data?.secureUrl ?? data?.secureUrl;
      if (!url) throw new Error('no url in response');
      onChange(url);
      toast.success(t('media.uploaded'));
    } catch (e) {
      toast.error(t('media.uploadFailed'), apiError(e));
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = '';
    }
  };

  return (
    <div className={`flex items-center gap-3 ${className ?? ''}`}>
      <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-md border border-border bg-surface-raised">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageIcon className="h-5 w-5" />
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          ref={ref}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => ref.current?.click()}
          disabled={busy}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {value ? t('common.replace', 'Replace') : t('media.upload')}
        </Button>
        {value && !busy && (
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange('')}>
            <X className="h-4 w-4" /> {t('common.remove', 'Remove')}
          </Button>
        )}
      </div>
    </div>
  );
}
