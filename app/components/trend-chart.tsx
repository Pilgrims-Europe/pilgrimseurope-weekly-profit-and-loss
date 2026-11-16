'use client';

import { CHART_THEME, ChartTooltip } from '@/components/chart-utils';
import { formatCompactUnit } from '@/lib/wpl-format';
import { Bar, BarChart, CartesianGrid, LabelList, Line, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface TrendPoint {
  label: string;
  value: number | null;
  actual: number | null;
}

/** Navy bars with value labels, as in the Travel Expense Dashboard. Overheads add the weekly actual as a line. */
export function TrendChart({ data, unit, showActual }: { data: TrendPoint[]; unit: string; showActual: boolean }) {
  const fmt = (v: number) => formatCompactUnit(v, unit);
  const Chart = showActual ? ComposedChart : BarChart;
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <Chart data={data} margin={{ top: 24, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid stroke={CHART_THEME.grid} vertical={false} />
          <XAxis dataKey="label" tick={CHART_THEME.tick} axisLine={false} tickLine={false} />
          <YAxis tick={CHART_THEME.tick} axisLine={false} tickLine={false} tickFormatter={fmt} width={72} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--muted)' }} />
          <Bar dataKey="value" name={showActual ? 'Run rate' : 'Value'} fill="var(--chart-1)" radius={[3, 3, 0, 0]}>
            <LabelList dataKey="value" position="top" formatter={(v: unknown) => (typeof v === 'number' ? fmt(v) : '')} style={{ fontSize: 11, fill: 'var(--chart-axis)' }} />
          </Bar>
          {showActual && (
            <Line dataKey="actual" name="Actual" stroke="var(--chart-2)" strokeWidth={2} dot={{ r: 3 }} />
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}
