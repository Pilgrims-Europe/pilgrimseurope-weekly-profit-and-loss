'use client';

import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode, useTransition } from 'react';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDef {
  /** URL search parameter, for example "site". */
  param: string;
  label: string;
  value: string;
  options: FilterOption[];
}

/**
 * Filter bar under the tabs, styled as the Travel Expense Dashboard pills ("Site Redruth ⌄").
 * Each filter is a URL parameter, so Share copies the exact view.
 */
export function FilterBar({ filters, note }: { filters: FilterDef[]; note?: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const set = (param: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    next.set(param, value);
    startTransition(() => router.push(`${pathname}?${next.toString()}`));
  };

  return (
    <div className="no-print border-b bg-card">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-2.5 px-4 py-3 sm:px-6 lg:px-8">
        {filters.map((f) => (
          <label
            key={f.param}
            className={cn(
              'relative inline-flex h-10 items-center gap-1.5 rounded-lg border bg-card pl-3 pr-8 text-sm shadow-xs transition-colors hover:border-pe-brand/50 focus-within:ring-2 focus-within:ring-ring',
              pending && 'opacity-70',
            )}
          >
            <span className="text-muted-foreground">{f.label}</span>
            <select
              aria-label={f.label}
              value={f.value}
              onChange={(e) => set(f.param, e.target.value)}
              className="max-w-[16rem] cursor-pointer appearance-none truncate bg-transparent font-semibold text-foreground outline-none"
            >
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 h-4 w-4 text-muted-foreground" />
          </label>
        ))}
        {note && <div className="ml-auto text-sm text-muted-foreground">{note}</div>}
      </div>
    </div>
  );
}
