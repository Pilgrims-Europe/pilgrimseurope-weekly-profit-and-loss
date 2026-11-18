import { PivotPage, type PivotParams } from '@/components/pivot-page';

export const dynamic = 'force-dynamic';

export default async function WeekByWeekPage({ searchParams }: { searchParams: Promise<PivotParams> }) {
  return <PivotPage layout="Anaplan template" params={await searchParams} />;
}
