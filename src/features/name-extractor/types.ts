import type { ReactNode } from 'react';
import type { ExtractionSettings, NameRow, RateLimits, TierId, estimateUsage } from '@/lib/gemini';

export type ExportFormat = 'nametxt' | 'names2txt';
export type UploadMode = 'replace' | 'append';
export type SortField = keyof Pick<NameRow, 'chinese' | 'hanviet' | 'category' | 'description' | 'count'>;
export type PageButton = number | 'ellipsis';

export type ProgressState = {
  ratio: number;
  label: string;
};

export type ToastState = {
  message: string;
  error: boolean;
} | null;

export type ExtractionState = {
  status: 'running' | 'failed';
  runKey: string;
  completed: number;
  total: number;
  chunkResults: Array<NameRow[] | null>;
} | null;

export type UsageEstimate = ReturnType<typeof estimateUsage>;

export type GuideEstimate = {
  model: UsageEstimate['model'];
  chunkCount: number;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
};

export type TierOption = {
  id: TierId;
  label: string;
};

export type MetricProps = {
  label: string;
  value: ReactNode;
};

export type RateLimitSummary = RateLimits;
export type SettingsPatchKey = keyof ExtractionSettings;
