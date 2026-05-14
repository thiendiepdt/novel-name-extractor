import type { RateLimitValue } from '@/lib/gemini';

export function formatUsd(value: number) {
  if (value <= 0) return '$0.0000';
  if (value < 0.0001) return '<$0.0001';
  return `$${value.toFixed(4)}`;
}

export function compactNumber(value: RateLimitValue) {
  if (typeof value !== 'number') return String(value);
  if (value >= 1000000) return `${Number(value / 1000000).toLocaleString(undefined, { maximumFractionDigits: 1 })}M`;
  if (value >= 1000) return `${Number(value / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}K`;
  return value.toLocaleString();
}

export function maskApiKey(value: string) {
  if (!value) return '';
  return `•••• ${value.slice(-4)}`;
}

export function formatQuickTranslatorName(value: string) {
  return value.replace(/\s*·\s*/g, ' · ');
}
