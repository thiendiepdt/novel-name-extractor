import type { PageButton } from '../types';

export function getPageButtons(currentPage: number, totalPages: number): PageButton[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
    pages.add(totalPages - 3);
  }

  const sorted = [...pages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  const output: PageButton[] = [];
  for (const page of sorted) {
    const previous = output[output.length - 1];
    if (typeof previous === 'number' && page - previous > 1) {
      output.push('ellipsis');
    }
    output.push(page);
  }

  return output;
}

export function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = Number.parseInt(String(value), 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}
