import { ChevronLeft, ChevronRight, Filter, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { CATEGORIES, CATEGORY_LABELS } from '../constants';
import type { Category, NameRow } from '@/lib/gemini';
import type { PageButton, SortField } from '../types';

export function ResultsPanel({
  category,
  currentPage,
  normalizedPageSize,
  pageButtons,
  pageJump,
  pagedRows,
  search,
  totalPages,
  visibleRows,
  onCategoryChange,
  onPageJumpApply,
  onPageJumpChange,
  onPageSizeChange,
  onPageSelect,
  onSearchChange,
  onSort,
}: {
  category: string;
  currentPage: number;
  normalizedPageSize: number;
  pageButtons: PageButton[];
  pageJump: string;
  pagedRows: NameRow[];
  search: string;
  totalPages: number;
  visibleRows: NameRow[];
  onCategoryChange: (category: string) => void;
  onPageJumpApply: () => void;
  onPageJumpChange: (value: string) => void;
  onPageSizeChange: (value: string) => void;
  onPageSelect: (page: number) => void;
  onSearchChange: (value: string) => void;
  onSort: (field: SortField) => void;
}) {
  return (
    <Card className="flex min-h-0 flex-col overflow-hidden">
      <CardHeader className="grid grid-cols-[auto_minmax(160px,1fr)_150px]">
        <CardTitle>Kết Quả Có Cấu Trúc</CardTitle>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Tìm tên..." />
        </div>
        <div className="relative">
          <Filter className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Select className="pl-8" value={category} onChange={(event) => onCategoryChange(event.target.value)}>
            <option value="">Tất cả loại</option>
            {CATEGORIES.map((item) => <option key={item} value={item}>{CATEGORY_LABELS[item]}</option>)}
          </Select>
        </div>
      </CardHeader>
      <CardContent className="relative min-h-0 flex-1 overflow-auto p-0">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-secondary">
            <tr>
              <ResultHead label="Tiếng Trung" field="chinese" onSort={onSort} />
              <ResultHead label="Hán Việt" field="hanviet" onSort={onSort} />
              <ResultHead label="Loại" field="category" onSort={onSort} />
              <ResultHead label="Mô tả" field="description" onSort={onSort} />
              <ResultHead label="Số lần" field="count" onSort={onSort} alignRight />
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row) => (
              <tr key={row.chinese} className="border-b border-border hover:bg-accent/40">
                <td className="px-3 py-2 font-mono font-semibold">{row.chinese}</td>
                <td className="px-3 py-2 font-semibold text-amber-300">{row.hanviet}</td>
                <td className="px-3 py-2">
                  <span className="inline-flex min-w-20 justify-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {CATEGORY_LABELS[row.category] || row.category}
                  </span>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{row.description}</td>
                <td className="px-3 py-2 text-right font-mono text-muted-foreground">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {visibleRows.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
            Dán text, thêm API key, rồi bấm Trích xuất.
          </div>
        )}
      </CardContent>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>
            {visibleRows.length === 0
              ? '0 kết quả'
              : `${((currentPage - 1) * normalizedPageSize) + 1}-${Math.min(currentPage * normalizedPageSize, visibleRows.length)} / ${visibleRows.length}`}
          </span>
          <Select className="h-8 w-24" value={String(normalizedPageSize)} onChange={(event) => onPageSizeChange(event.target.value)}>
            {[20, 50, 100, 200, 500].map((limit) => (
              <option key={limit} value={limit}>{limit}/trang</option>
            ))}
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="secondary" className="h-8 px-2" disabled={currentPage <= 1} onClick={() => onPageSelect(currentPage - 1)}>
            <ChevronLeft className="h-4 w-4" />
            Trước
          </Button>
          {pageButtons.map((item, index) => (
            item === 'ellipsis'
              ? <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">...</span>
              : (
                <Button
                  key={item}
                  variant={item === currentPage ? 'default' : 'secondary'}
                  className="h-8 min-w-8 px-2"
                  onClick={() => onPageSelect(item)}
                >
                  {item}
                </Button>
              )
          ))}
          <Button variant="secondary" className="h-8 px-2" disabled={currentPage >= totalPages} onClick={() => onPageSelect(currentPage + 1)}>
            Sau
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onPageJumpApply();
          }}
        >
          <span>Đến</span>
          <Input
            className="h-8 w-16 font-mono"
            type="number"
            min="1"
            max={totalPages}
            value={pageJump}
            onChange={(event) => onPageJumpChange(event.target.value)}
          />
          <span>/ {totalPages}</span>
        </form>
      </div>
    </Card>
  );
}

function ResultHead({
  label,
  field,
  onSort,
  alignRight = false,
}: {
  label: string;
  field: SortField;
  onSort: (field: SortField) => void;
  alignRight?: boolean;
}) {
  return (
    <th
      className={`cursor-pointer whitespace-nowrap border-b border-border px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground ${alignRight ? 'text-right' : ''}`}
      onClick={() => onSort(field)}
    >
      {label}
    </th>
  );
}
