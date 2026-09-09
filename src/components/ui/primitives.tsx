import * as React from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DateInput } from './date-input';

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('rounded-lg border border-border bg-card text-card-foreground', className)}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const fieldBase =
  'w-full rounded-lg border border-input bg-surface text-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 hover:border-border focus:border-accent focus:ring-2 focus:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-50';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    const innerRef = React.useRef<HTMLInputElement | null>(null);
    const setRef = (node: HTMLInputElement | null) => {
      innerRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
    };

    if (type === 'number') {
      const step = (dir: 1 | -1) => {
        const el = innerRef.current;
        if (!el || el.disabled) return;
        dir === 1 ? el.stepUp() : el.stepDown();
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      return (
        <div
          className={cn(
            fieldBase,
            'flex h-11 items-stretch overflow-hidden p-0 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25',
            className,
          )}
        >
          <button
            type="button"
            tabIndex={-1}
            onClick={() => step(-1)}
            className="flex w-9 shrink-0 items-center justify-center border-e border-input text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Decrease"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <input
            ref={setRef}
            type="number"
            className="min-w-0 flex-1 bg-transparent px-3 text-center text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            {...props}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => step(1)}
            className="flex w-9 shrink-0 items-center justify-center border-s border-input text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Increase"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      );
    }

    if (type === 'date') {
      return (
        <DateInput
          className={className}
          value={props.value as string | undefined}
          min={props.min as string | undefined}
          max={props.max as string | undefined}
          disabled={props.disabled}
          name={props.name}
          id={props.id}
          onChange={(v) => {
            const handler = props.onChange as
              | ((e: { target: { value: string; name?: string } }) => void)
              | undefined;
            handler?.({ target: { value: v, name: props.name } });
          }}
        />
      );
    }

    return <input ref={setRef} type={type} className={cn(fieldBase, 'h-11 px-3.5', className)} {...props} />;
  },
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(fieldBase, 'min-h-[88px] px-3.5 py-2.5', className)} {...props} />
));
Textarea.displayName = 'Textarea';

export { Select } from './select';

export function Field({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

export function Label({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('text-sm font-medium', className)} {...props} />;
}
