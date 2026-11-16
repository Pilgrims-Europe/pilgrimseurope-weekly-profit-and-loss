import fs from 'node:fs';
import path from 'node:path';

import { HeaderNav, HeaderTitle } from '@/components/header-nav';
import { PILGRIMS_LOGO } from '@/lib/constants';
import { getFreshness } from '@/lib/wpl';

/** Long date as in the Travel Expense Dashboard header: "16 Nov 2026, 11:00". */
function longDate(value: string | null | undefined, withTime: boolean): string {
  if (!value) return 'Unknown';
  const d = new Date(value.replace(' ', 'T') + (withTime ? ':00Z' : 'T00:00:00Z'));
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' } : { timeZone: 'UTC' }),
  });
}

/**
 * AppHeader — navy band with the Pilgrim's logo, page title, data refresh time and the tab bar.
 * It reads the refresh time from WPL_T_DQ_FRESHNESS. A failed read shows "Unknown", not an error.
 */
export async function AppHeader() {
  let refreshed: string | null = null;
  let glTo: string | null = null;
  try {
    const f = await getFreshness();
    refreshed = f[0]?.REFRESHED_AT ?? null;
    glTo = f.find((x) => x.SOURCE === 'GL line items')?.DATA_TO ?? null;
  } catch (e) {
    console.error(new Date().toISOString(), '[header] freshness read failed', e);
  }
  const hasLogo = fs.existsSync(path.join(process.cwd(), 'public', PILGRIMS_LOGO));

  return (
    <header className="w-full">
      <div className="pe-hero">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex shrink-0 items-center gap-5">
            {hasLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={PILGRIMS_LOGO} alt="Pilgrim's Europe" className="h-11 w-auto" />
            ) : (
              <div className="flex flex-col leading-none" aria-label="Pilgrim's Europe">
                <span className="font-serif text-2xl font-semibold italic tracking-tight">Pilgrim&apos;s</span>
                <span className="mt-0.5 text-center text-[10px] uppercase tracking-[0.3em] text-white/80">Europe</span>
              </div>
            )}
            <span className="hidden h-10 w-px bg-white/25 sm:block" />
          </div>
          <HeaderTitle />
          <div className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-white/85">
            <span>
              Latest data refresh <strong className="text-white">{longDate(refreshed, true)}</strong>
            </span>
            <span>
              GL to <strong className="text-white">{longDate(glTo, false)}</strong>
            </span>
          </div>
        </div>
      </div>
      <HeaderNav />
    </header>
  );
}
