import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { Dialog } from './dialog';
import { Button } from './button';

interface ConfirmOptions {
  title?: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style the confirm button as destructive. */
  danger?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(v: boolean) => void>();

  const confirm = useCallback<ConfirmFn>((next) => {
    setOpts(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = undefined;
    setOpts(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={!!opts}
        onClose={() => settle(false)}
        title={opts?.title ?? t('common.confirm', 'Confirm')}
        size="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => settle(false)}>
              {opts?.cancelLabel ?? t('common.cancel', 'Cancel')}
            </Button>
            <Button
              size="sm"
              variant={opts?.danger ? 'danger' : 'primary'}
              onClick={() => settle(true)}
              autoFocus
            >
              {opts?.confirmLabel ?? t('common.confirm', 'Confirm')}
            </Button>
          </>
        }
      >
        <div className="flex gap-3">
          <span
            className={
              opts?.danger
                ? 'mt-0.5 shrink-0 rounded-full bg-danger/10 p-1.5 text-danger'
                : 'mt-0.5 shrink-0 rounded-full bg-accent/10 p-1.5 text-accent'
            }
          >
            <AlertTriangle className="h-4 w-4" />
          </span>
          <p className="text-sm text-muted-foreground">{opts?.message}</p>
        </div>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
