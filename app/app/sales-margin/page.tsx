import { PivotPage, type PivotParams } from '@/components/pivot-page';

export const dynamic = 'force-dynamic';

export default async function SalesMarginPage({ searchParams }: { searchParams: Promise<PivotParams> }) {
  return <PivotPage layout="Sales margin" params={await searchParams} />;
}
