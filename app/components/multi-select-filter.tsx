'use client';

import { cn } from '@/lib/utils';
import { ChevronDown, Search, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';

export interface MultiOption {
  value: string;
  label: string;
}

/**
 * A filter pill that selects more than one value, in the same style as the Site and Period pills.
 * Each selected value is one URL parameter (?cust=1&cust=2), so Share copies the view.
 * The page reloads when you click Apply, not on each tick.
 */
export function MultiSelectFilter({
  param,
  label,
  options,
  selected,
}: {
  param: string;
  label: string;
  options: MultiOption[];
  selected: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<Set<string>>(new Set(selected));
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => setDraft(new Set(selected)), [selected]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, search]);

  const apply = (values: Set<string>) => {
    const next = new URLSearchParams(params.toString());
    next.delete(param);
    for (const v of values) next.append(param, v);
    setOpen(false);
    startTransition(() => router.push(`${pathname}?${next.toString()}`));
  };

  const names = selected.map((v) => options.find((o) => o.value === v)?.label ?? v);
  const summary = selected.length === 0 ? 'All' : selected.length === 1 ? names[0] : `${selected.length} selected`;

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'relative inline-flex h-10 items-center gap-1.5 rounded-lg border bg-card pl-3 pr-8 text-sm shadow-xs transition-colors hover:border-pe-brand/50 focus-visible:ring-2 focus-visible:ring-ring',
          selected.length > 0 && 'border-pe-brand/60',
          pending && 'opacity-70',
        )}
      >
        <span className="text-muted-foreground">{label}</span>
        <span className="max-w-[12rem] truncate font-semibold text-foreground">{summary}</span>
        <ChevronDown className="pointer-events-none absolute right-2.5 h-4 w-4 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute left-0 z-50 mt-1 w-80 rounded-lg border bg-popover p-2 text-popover-foreground shadow-lg">
          <label className="flex items-center gap-2 rounded-md border px-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}`}
              aria-label={`Search ${label.toLowerCase()}`}
              className="h-8 w-full bg-transparent text-sm outline-none"
            />
            {search && (
              <button type="button" aria-label="Clear search" onClick={() => setSearch('')}>
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </label>
          <div role="listbox" aria-multiselectable="true" aria-label={label} className="mt-2 max-h-64 overflow-y-auto">
            {shown.length === 0 && <p className="px-2 py-3 text-sm text-muted-foreground">No values.</p>}
            {shown.map((o) => (
              <label key={o.value} className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-[#00406e]"
                  checked={draft.has(o.value)}
                  onChange={(e) =>
                    setDraft((d) => {
                      const next = new Set(d);
                      if (e.target.checked) next.add(o.value);
                      else next.delete(o.value);
                      return next;
                    })
                  }
                />
                <span className="min-w-0 break-words">{o.label}</span>
              </label>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 border-t pt-2 text-sm">
            <span className="text-muted-foreground">{draft.size ? `${draft.size} selected` : 'All'}</span>
            <span className="flex gap-2">
              <button type="button" className="rounded-md px-3 py-1.5 font-semibold text-pe-brand hover:bg-muted" onClick={() => apply(new Set())}>
                Clear
              </button>
              <button
                type="button"
                className="rounded-md bg-[#00406e] px-3 py-1.5 font-semibold text-white hover:bg-[#00406e]/90"
                onClick={() => apply(draft)}
              >
                Apply
              </button>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
