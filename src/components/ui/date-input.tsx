import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ISO helpers (YYYY-MM-DD, local) */
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parse = (s?: string) => {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};
const fmt = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

interface Props {
  value?: string;
  onChange?: (isoDate: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  name?: string;
  id?: string;
}

/** Themed date field — DD/MM/YYYY display, custom calendar popover, no native UI. */
export function DateInput({
  value,
  onChange,
  min,
  max,
  disabled,
  className,
  placeholder = 'DD/MM/YYYY',
  name,
  id,
}: Props) {
  const selected = parse(value);
  const minD = parse(min);
  const maxD = parse(max);

  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => selected ?? new Date());
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (open && selected) setView(selected);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (r) setRect({ top: r.bottom + 6, left: r.left, width: Math.max(r.width, 260) });
    };
    place();
    const onDoc = (e: MouseEvent) => {
      if (!btnRef.current?.contains(e.target as Node) && !popRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  const days = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [view]);

  const disabledDay = (d: Date) =>
    (minD && d < new Date(minD.getFullYear(), minD.getMonth(), minD.getDate())) ||
    (maxD && d > new Date(maxD.getFullYear(), maxD.getMonth(), maxD.getDate()));

  const pick = (d: Date) => {
    if (disabledDay(d)) return;
    onChange?.(iso(d));
    setOpen(false);
  };

  return (
    <>
      <input type="hidden" name={name} value={value ?? ''} readOnly />
      <button
        ref={btnRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-11 w-full items-center gap-2 rounded-lg border border-input bg-surface px-3.5 text-sm outline-none transition-[border-color,box-shadow] hover:border-border focus:border-accent focus:ring-2 focus:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-50',
          open && 'border-accent ring-2 ring-accent/25',
          className,
        )}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className={cn('flex-1 text-start', !selected && 'text-muted-foreground')} dir="ltr">
          {selected ? fmt(selected) : placeholder}
        </span>
        {selected && !disabled && (
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              onChange?.('');
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </span>
        )}
      </button>

      {open &&
        rect &&
        createPortal(
          <div
            ref={popRef}
            dir="ltr"
            style={{ position: 'fixed', top: rect.top, left: rect.left, zIndex: 95, width: 260 }}
            className="rounded-lg border border-border bg-surface-raised p-3 text-sm shadow-xl shadow-black/40 animate-in fade-in-0 zoom-in-95"
          >
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-semibold">
                {MONTHS[view.getMonth()]} {view.getFullYear()}
              </span>
              <button
                type="button"
                onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-semibold uppercase text-muted-foreground">
              {DOW.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {days.map((d, i) => {
                const inMonth = d.getMonth() === view.getMonth();
                const isSel = selected && iso(d) === iso(selected);
                const isToday = iso(d) === iso(new Date());
                const off = !!disabledDay(d);
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={off}
                    onClick={() => pick(d)}
                    className={cn(
                      'h-7 rounded text-xs transition-colors',
                      !inMonth && 'text-muted-foreground/40',
                      off && 'cursor-not-allowed opacity-30',
                      isSel
                        ? 'bg-accent font-semibold text-accent-foreground'
                        : !off && 'hover:bg-muted',
                      !isSel && isToday && 'ring-1 ring-accent/50',
                    )}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  onChange?.('');
                  setOpen(false);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => pick(new Date())}
                className="font-semibold text-accent hover:underline"
              >
                Today
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
