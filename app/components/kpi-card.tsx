import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';

/**
 * KpiCard — white card with an uppercase label, a large navy value, a short note and a
 * "See ... →" link, as on the Travel Expense Dashboard overview.
 */
export function KpiCard({
  label,
  value,
  note,
  href,
  linkText,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  href?: string;
  linkText?: string;
  tone?: 'bad' | 'good';
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl border bg-card p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div
        className={cn(
          'truncate text-3xl font-semibold tabular-nums text-[#1b2d4a] dark:text-white',
          tone === 'bad' && 'text-pe-red dark:text-pe-red',
          tone === 'good' && 'text-pe-green dark:text-pe-green',
        )}
      >
        {value}
      </div>
      {note && <div className="text-sm text-muted-foreground">{note}</div>}
      {href && linkText && (
        <Link href={href} className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-semibold text-pe-brand hover:underline">
          {linkText} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
