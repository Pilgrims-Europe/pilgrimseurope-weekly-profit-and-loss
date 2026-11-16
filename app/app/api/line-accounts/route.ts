import { getLineAccounts } from '@/lib/wpl';

export const dynamic = 'force-dynamic';

/** GET /api/line-accounts?site=Redruth&week=2026-11-02&line=510 — GL accounts behind one line. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const site = url.searchParams.get('site');
  const week = url.searchParams.get('week');
  const line = Number(url.searchParams.get('line'));
  if (!site || !week || !/^\d{4}-\d{2}-\d{2}$/.test(week) || !Number.isInteger(line)) {
    return Response.json({ error: 'site, week (YYYY-MM-DD) and line are required' }, { status: 400 });
  }
  try {
    return Response.json(await getLineAccounts(site, week, line));
  } catch (e) {
    console.error(new Date().toISOString(), '[line-accounts] query failed', e);
    return Response.json({ error: 'Query failed' }, { status: 500 });
  }
}
