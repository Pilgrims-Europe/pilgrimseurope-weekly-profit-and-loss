import { cn } from '@/lib/utils';

/** RAG badge in the house colours: Green good, Amber warning, Red bad. Subtotals show no RAG. */
export function RagBadge({ rag, className }: { rag: string | null | undefined; className?: string }) {
  if (!rag) return <span className={cn('text-xs text-muted-foreground', className)}>Subtotal</span>;
  const tone =
    rag === 'Green'
      ? 'bg-pe-tint-green text-pe-green border-pe-green/30'
      : rag === 'Amber'
        ? 'bg-pe-tint-yellow text-[#976611] dark:text-[#ffc966] border-pe-yellow/40'
        : 'bg-pe-tint-red text-pe-red border-pe-red/30';
  return (
    <span
      className={cn(
        'pe-head inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs whitespace-nowrap',
        tone,
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'h-2 w-2 rounded-full',
          rag === 'Green' ? 'bg-pe-green' : rag === 'Amber' ? 'bg-pe-yellow' : 'bg-pe-red',
        )}
      />
      {rag}
    </span>
  );
}
