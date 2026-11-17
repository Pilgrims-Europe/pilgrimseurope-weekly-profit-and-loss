import { EmptyState } from '@/components/empty-state';
import { FilterBar } from '@/components/filter-bar';
import { KpiCard } from '@/components/kpi-card';
import { RagBadge } from '@/components/rag-badge';
import { REPO_URL } from '@/lib/constants';
import { getLines, getRagCounts } from '@/lib/wpl';
import { ticketUrl } from '@/lib/wpl-format';
import type React from 'react';

export const dynamic = 'force-dynamic';

const RAGS = ['All', 'Green', 'Amber', 'Red', 'Subtotal'];

export default async function LinesPage({ searchParams }: { searchParams: Promise<{ rag?: string }> }) {
  const params = await searchParams;
  const rag = RAGS.includes(params.rag ?? '') ? (params.rag as string) : 'All';
  let content: React.ReactNode;

  try {
    const [lines, counts] = await Promise.all([getLines(), getRagCounts()]);
    const shown = lines.filter((l) => rag === 'All' || (rag === 'Subtotal' ? !l.RAG : l.RAG === rag));
    content = (
      <>
        <p className="text-sm text-muted-foreground">
          The RAG comes from ticket #11 (reports/anaplan-line-tags.html). It is for the pilot sites, Redruth and Bromborough.
          Kill lines use the kill sites. This build makes the Green and Amber lines. Amber lines use the default rule shown.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Green" value={counts.Green ?? 0} note="Data in a PROD schema and the rule is known." tone="good" href="/lines?rag=Green" linkText="Show" />
          <KpiCard label="Amber" value={counts.Amber ?? 0} note="Data in Snowflake. The rule or mapping is Unknown." href="/lines?rag=Amber" linkText="Show" />
          <KpiCard label="Red" value={counts.Red ?? 0} note="Manual, not in Snowflake, or not researched." tone="bad" href="/lines?rag=Red" linkText="Show" />
          <KpiCard label="Subtotal" value={counts.Subtotal ?? 0} note="A formula on other lines. No RAG." href="/lines?rag=Subtotal" linkText="Show" />
        </div>
        <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
          {shown.length === 0 ? (
            <EmptyState title="No lines" className="m-5" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#00406e] text-white">
                  <tr>
                    {['Line', 'Group', 'RAG', 'Source type', 'System', 'Why this RAG', 'Rule used', 'Ticket'].map((h) => (
                      <th key={h} className="pe-head px-4 py-2.5 text-left font-normal whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shown.map((l) => {
                    const t = ticketUrl(REPO_URL, l.TICKET);
                    return (
                      <tr key={l.LINE_ID} className="border-b align-top hover:bg-muted/40">
                        <td className="px-4 py-2 font-semibold whitespace-nowrap">{l.LINE_NAME}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">{l.LINE_GROUP}</td>
                        <td className="px-4 py-2">{l.RAG ? <RagBadge rag={l.RAG} /> : <span className="text-xs text-muted-foreground">Subtotal</span>}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{l.SOURCE_TYPE}</td>
                        <td className="min-w-[10rem] px-4 py-2">{l.SOURCE_SYSTEM ?? ''}</td>
                        <td className="min-w-[14rem] px-4 py-2">{l.REASON ?? ''}</td>
                        <td className="min-w-[16rem] px-4 py-2 text-muted-foreground">
                          {l.RULE ?? (l.COMPONENTS ? 'Sum of its component lines.' : l.RAG === 'Red' ? 'Not built.' : '')}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {t ? (
                            <a href={t} target="_blank" rel="noreferrer" className="text-pe-brand hover:underline">
                              {l.TICKET}
                            </a>
                          ) : (
                            ''
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </>
    );
  } catch (e) {
    console.error(new Date().toISOString(), '[lines] load failed', e);
    content = (
      <EmptyState variant="error" title="The lines did not load" description={e instanceof Error ? e.message : 'Unknown error'} />
    );
  }

  return (
    <>
      <FilterBar filters={[{ param: 'rag', label: 'RAG', value: rag, options: RAGS.map((r) => ({ value: r, label: r })) }]} />
      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">{content}</main>
    </>
  );
}
