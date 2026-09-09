import * as React from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Custom dropdown that is a drop-in replacement for a native <select>.
 *
 * Same API surface as `React.SelectHTMLAttributes<HTMLSelectElement>` — `value`,
 * `defaultValue`, `onChange`, `name`, `disabled`, `className`, `<option>` children
 * — so every existing call site and `react-hook-form` `register(...)` spread keeps
 * working unchanged. A visually-hidden real <select> is kept in the DOM only for
 * native form submission / ref reads; it is not focusable or interactive. The
 * visible control is fully custom (no OS dropdown ever shows).
 */

type Opt = { value: string; label: string; disabled: boolean };

function collectOptions(children: React.ReactNode): Opt[] {
  const out: Opt[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === React.Fragment) {
      out.push(...collectOptions((child.props as { children?: React.ReactNode }).children));
      return;
    }
    if (child.type === 'option') {
      const p = child.props as {
        value?: string | number;
        children?: React.ReactNode;
        disabled?: boolean;
      };
      const label = typeof p.children === 'string' ? p.children : String(p.children ?? '');
      const value = p.value !== undefined ? String(p.value) : label;
      out.push({ value, label, disabled: Boolean(p.disabled) });
    }
  });
  return out;
}

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  (
    { className, children, value, defaultValue, onChange, onBlur, name, disabled, id, ...rest },
    ref,
  ) => {
    const options = React.useMemo(() => collectOptions(children), [children]);
    const isControlled = value !== undefined;

    const [internal, setInternal] = React.useState<string>(() => {
      if (value !== undefined) return String(value);
      if (defaultValue !== undefined) return String(defaultValue);
      return options.find((o) => !o.disabled)?.value ?? '';
    });
    const current = isControlled ? String(value) : internal;

    const [open, setOpen] = React.useState(false);
    const [active, setActive] = React.useState(0);
    const btnRef = React.useRef<HTMLButtonElement>(null);
    const listRef = React.useRef<HTMLUListElement>(null);
    const hiddenRef = React.useRef<HTMLSelectElement | null>(null);
    const [rect, setRect] = React.useState<{ top: number; left: number; width: number } | null>(null);

    const setHiddenRef = (node: HTMLSelectElement | null) => {
      hiddenRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLSelectElement | null>).current = node;
    };

    const selected = options.find((o) => o.value === current);

    const emit = (v: string) => {
      if (hiddenRef.current) hiddenRef.current.value = v;
      if (!isControlled) setInternal(v);
      onChange?.({
        target: { value: v, name: name ?? '' },
        currentTarget: { value: v, name: name ?? '' },
        type: 'change',
      } as unknown as React.ChangeEvent<HTMLSelectElement>);
    };

    const choose = (v: string) => {
      emit(v);
      close();
      btnRef.current?.focus();
    };

    const place = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (r) setRect({ top: r.bottom + 4, left: r.left, width: r.width });
    };

    const openMenu = () => {
      if (disabled) return;
      place();
      setActive(Math.max(0, options.findIndex((o) => o.value === current)));
      setOpen(true);
    };

    const close = () => {
      setOpen(false);
      onBlur?.({ target: { name: name ?? '' }, type: 'blur' } as unknown as React.FocusEvent<HTMLSelectElement>);
    };

    React.useEffect(() => {
      if (!open) return;
      const onDoc = (e: MouseEvent) => {
        if (
          !btnRef.current?.contains(e.target as Node) &&
          !listRef.current?.contains(e.target as Node)
        )
          close();
      };
      const onScrollResize = () => place();
      document.addEventListener('mousedown', onDoc);
      window.addEventListener('resize', onScrollResize);
      window.addEventListener('scroll', onScrollResize, true);
      return () => {
        document.removeEventListener('mousedown', onDoc);
        window.removeEventListener('resize', onScrollResize);
        window.removeEventListener('scroll', onScrollResize, true);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    React.useEffect(() => {
      if (open) listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
    }, [open, active]);

    const onKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;
      if (!open) {
        if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
          e.preventDefault();
          openMenu();
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        btnRef.current?.focus();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((i) => {
          let n = i;
          do n = (n + 1) % options.length;
          while (options[n]?.disabled && n !== i);
          return n;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((i) => {
          let n = i;
          do n = (n - 1 + options.length) % options.length;
          while (options[n]?.disabled && n !== i);
          return n;
        });
      } else if (e.key === 'Home') {
        e.preventDefault();
        setActive(options.findIndex((o) => !o.disabled));
      } else if (e.key === 'End') {
        e.preventDefault();
        setActive(options.length - 1);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const opt = options[active];
        if (opt && !opt.disabled) choose(opt.value);
      } else if (e.key.length === 1) {
        const q = e.key.toLowerCase();
        const idx = options.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(q));
        if (idx >= 0) setActive(idx);
      }
    };

    return (
      <>
        <select
          ref={setHiddenRef}
          name={name}
          value={current}
          onChange={(e) => {
            if (!isControlled) setInternal(e.target.value);
            onChange?.(e);
          }}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden
          className="sr-only"
        >
          {children}
        </select>

        <button
          ref={btnRef}
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          disabled={disabled}
          onClick={() => (open ? close() : openMenu())}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (!open)
              onBlur?.({ target: { name: name ?? '' }, type: 'blur' } as unknown as React.FocusEvent<HTMLSelectElement>);
          }}
          className={cn(
            'flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-input bg-surface px-3.5 text-sm outline-none transition-[border-color,box-shadow] hover:border-border focus:border-accent focus:ring-2 focus:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-50',
            open && 'border-accent ring-2 ring-accent/25',
            className,
          )}
          {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>
            {selected?.label ?? '—'}
          </span>
          <ChevronDown
            className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
          />
        </button>

        {open &&
          rect &&
          createPortal(
            <ul
              ref={listRef}
              role="listbox"
              style={{ position: 'fixed', top: rect.top, left: rect.left, width: rect.width, zIndex: 95 }}
              className="max-h-64 overflow-auto rounded-md border border-border bg-surface-raised p-1 text-sm shadow-xl shadow-black/40 animate-in fade-in-0 zoom-in-95"
            >
              {options.map((o, i) => (
                <li
                  key={o.value + i}
                  role="option"
                  aria-selected={o.value === current}
                  data-active={i === active}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => !o.disabled && choose(o.value)}
                  className={cn(
                    'flex cursor-pointer items-center justify-between gap-2 rounded-sm px-2.5 py-1.5',
                    o.disabled && 'cursor-not-allowed opacity-40',
                    i === active && !o.disabled && 'bg-accent/10 text-accent',
                    o.value === current && 'font-medium',
                  )}
                >
                  <span className="truncate">{o.label}</span>
                  {o.value === current && <Check className="h-3.5 w-3.5 shrink-0 text-accent" />}
                </li>
              ))}
            </ul>,
            document.body,
          )}
      </>
    );
  },
);
Select.displayName = 'Select';
