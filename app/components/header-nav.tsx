'use client';

import { CommandPalette } from '@/components/command-palette';
import { ThemeToggle } from '@/components/theme-toggle';
import { copyText } from '@/lib/clipboard';
import { NAV_ITEMS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Check, Link2, Printer } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState } from 'react';

function current(pathname: string) {
  return NAV_ITEMS.find((i) => (i.href === '/' ? pathname === '/' : pathname.startsWith(i.href))) ?? NAV_ITEMS[0];
}

/** Page title and one-line description in the header band. */
export function HeaderTitle() {
  const page = current(usePathname());
  return (
    <div className="min-w-0 flex-1">
      <h1 className="pe-head truncate text-xl leading-tight text-white">{page.label}</h1>
      <p className="truncate text-sm text-white/75">{page.description}</p>
    </div>
  );
}

/** Tab bar on the dark band. Tabs keep the site and week in the URL. Share copies the link. */
export function HeaderNav() {
  const pathname = usePathname();
  const params = useSearchParams();
  const page = current(pathname);
  const [copied, setCopied] = useState(false);
  const keep = new URLSearchParams();
  for (const k of ['site', 'week', 'period', 'show']) {
    const v = params.get(k);
    if (v) keep.set(k, v);
  }
  const qs = keep.toString() ? `?${keep.toString()}` : '';

  return (
    <nav aria-label="Pages" className="pe-tabs no-print">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-4 py-1.5 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={`${item.href}${qs}`}
              title={item.description}
              className={cn(
                'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-semibold text-white/85 transition-colors hover:bg-white/10 hover:text-white',
                item.href === page.href && 'bg-white/20 text-white',
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-1.5 [&_button]:border-white/30 [&_button]:bg-transparent [&_button]:text-white [&_button:hover]:bg-white/10">
          <button
            type="button"
            title="Copy a link to this view, with its site and week"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm"
            onClick={async () => {
              if (await copyText(window.location.href)) {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }
            }}
          >
            {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Share'}</span>
          </button>
          <button
            type="button"
            title="Print or save as PDF"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Print</span>
          </button>
          <CommandPalette />
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
