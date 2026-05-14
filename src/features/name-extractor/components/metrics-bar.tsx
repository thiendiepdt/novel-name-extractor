import { formatUsd } from '../lib/format';
import type { NameRow } from '@/lib/gemini';
import type { MetricProps, ProgressState, UsageEstimate } from '../types';

type MetricsBarProps = {
  selectedModel: string;
  sourceText: string;
  chunks: string[];
  usageEstimate: UsageEstimate;
  rows: NameRow[];
  progress: ProgressState;
};

export function MetricsBar({ selectedModel, sourceText, chunks, usageEstimate, rows, progress }: MetricsBarProps) {
  return (
    <section className="flex flex-wrap items-center gap-x-4 gap-y-0.5 border-b border-border bg-card px-3 py-1 text-xs">
      <Metric label="Model" value={selectedModel} />
      <Metric label="Ký tự" value={[...sourceText].length.toLocaleString()} />
      <Metric label="Chunk" value={chunks.length.toLocaleString()} />
      <Metric label="Token vào" value={`~${usageEstimate.inputTokens.toLocaleString()}`} />
      <Metric label="Token ra" value={`~${usageEstimate.outputTokens.toLocaleString()}`} />
      <Metric label="Chi phí" value={`~${formatUsd(usageEstimate.totalCost)}`} />
      <Metric label="Kết quả" value={rows.length.toLocaleString()} />
      <Metric label="Tiến độ" value={progress.label} />
    </section>
  );
}

function Metric({ label, value }: MetricProps) {
  return (
    <div className="inline-flex min-w-0 items-baseline gap-1.5">
      <span className="text-muted-foreground">{label}</span>
      <strong className="truncate font-mono text-foreground">{value}</strong>
    </div>
  );
}
