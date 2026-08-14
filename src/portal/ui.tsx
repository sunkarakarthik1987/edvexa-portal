import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn('uh-card p-5', className)}>{children}</section>;
}

export function CardHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-4 flex items-start justify-between gap-4">
      <div>
        {eyebrow && <p className="uh-eyebrow mb-1">{eyebrow}</p>}
        <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
      </div>
      {action}
    </header>
  );
}

export function Pill({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors',
        active
          ? 'border-ink bg-ink text-canvas shadow-glow'
          : 'border-rule bg-white/5 text-ink-soft backdrop-blur-sm hover:border-ink hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}

export function Tag({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-block rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em]',
        TONE_CLASSES[tone],
      )}
    >
      {children}
    </span>
  );
}

type Tone = 'neutral' | 'good' | 'warn' | 'bad' | 'info';

const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'bg-rule/50 text-ink-soft',
  good: 'bg-ink text-canvas',
  warn: 'bg-accent/15 text-accent',
  bad: 'bg-red-950 text-red-300',
  info: 'bg-ink/10 text-ink',
};

export function Progress({ value, label }: { value: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div>
      {label && (
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-sm text-ink-soft">{label}</span>
          <span className="font-mono text-xs text-ink">{clamped}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-1.5 w-full overflow-hidden rounded-full bg-rule/60"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent to-ink shadow-glow transition-[width] duration-500"
          style={{ width: clamped + '%' }}
        />
      </div>
    </div>
  );
}

const AVATAR_COLOURS = ['#173600', '#C05800', '#3D5B29', '#8A5A00', '#2F4858'];

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  const index = name.charCodeAt(0) % AVATAR_COLOURS.length;
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-mono text-xs text-white ring-2 ring-white/15"
      style={{ width: size, height: size, backgroundColor: AVATAR_COLOURS[index] }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="uh-card p-4">
      <p className="uh-eyebrow mb-2">{label}</p>
      <p className="font-mono text-2xl leading-none text-ink">{value}</p>
      {hint && <p className="mt-2 text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-card border border-dashed border-rule p-8 text-center">
      <p className="mb-1 font-medium text-ink">{title}</p>
      <p className="text-sm text-ink-faint">{hint}</p>
    </div>
  );
}
