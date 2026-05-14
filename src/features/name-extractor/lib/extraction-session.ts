import { normalizeExtractionSettings } from '@/lib/gemini';
import type { ExtractionSettings, NameRow } from '@/lib/gemini';

export function buildExtractionRunKey(sourceText: string, modelId: string, settings: Partial<ExtractionSettings>) {
  return JSON.stringify({
    text: sourceText.trim(),
    modelId,
    settings: normalizeExtractionSettings(settings),
  });
}

export function countCompletedChunks(chunkResults: Array<NameRow[] | null> = []) {
  return chunkResults.filter((rows) => Array.isArray(rows)).length;
}

export function getProgressRatio(completed: number, total: number) {
  if (!total) return 0;
  return Math.min(1, Math.max(0, completed / total));
}

export function getRawPreviewText(value: string) {
  if (value.length <= 4000) return value;
  return `${value.slice(0, 2500)}\n\n...\n\n${value.slice(-1000)}`;
}
