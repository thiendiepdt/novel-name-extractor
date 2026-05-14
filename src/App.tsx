import { useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import { AppHeader } from '@/features/name-extractor/components/app-header';
import { ExportPanel } from '@/features/name-extractor/components/export-panel';
import { GuideDialog } from '@/features/name-extractor/components/guide-dialog';
import { MetricsBar } from '@/features/name-extractor/components/metrics-bar';
import { RawPreviewDialog } from '@/features/name-extractor/components/raw-preview-dialog';
import { ResultsPanel } from '@/features/name-extractor/components/results-panel';
import { SourcePanel } from '@/features/name-extractor/components/source-panel';
import { Toast } from '@/features/name-extractor/components/toast';
import { STORAGE_KEYS } from '@/features/name-extractor/constants';
import { useStoredJsonState, useStoredState } from '@/features/name-extractor/hooks/use-stored-state';
import {
  buildExtractionRunKey,
  countCompletedChunks,
  getProgressRatio,
} from '@/features/name-extractor/lib/extraction-session';
import { formatQuickTranslatorName } from '@/features/name-extractor/lib/format';
import { getGuideNovelEstimate } from '@/features/name-extractor/lib/guide-estimate';
import { clampNumber, getPageButtons } from '@/features/name-extractor/lib/pagination';
import type {
  ExportFormat,
  ExtractionState,
  ProgressState,
  SettingsPatchKey,
  SortField,
  ToastState,
  UploadMode,
} from '@/features/name-extractor/types';
import {
  DEFAULT_EXTRACTION_SETTINGS,
  DEFAULT_MODEL_ID,
  TIER_OPTIONS,
  estimateUsage,
  extractChunksWithQueue,
  getRateLimits,
  mergeRows,
  normalizeExtractionSettings,
  splitIntoChunks,
} from '@/lib/gemini';
import type { ExtractionSettings, NameRow } from '@/lib/gemini';

export default function App() {
  const [legacyApiKey, setLegacyApiKey] = useStoredState(STORAGE_KEYS.legacyApiKey, '');
  const [apiKeys, setApiKeys] = useStoredJsonState<string[]>(STORAGE_KEYS.apiKeys, []);
  const [selectedModel, setSelectedModel] = useStoredState(STORAGE_KEYS.model, DEFAULT_MODEL_ID);
  const [settings, setSettings] = useStoredJsonState<ExtractionSettings>(STORAGE_KEYS.settings, DEFAULT_EXTRACTION_SETTINGS);
  const [pageSize, setPageSize] = useStoredState(STORAGE_KEYS.pageSize, '20');

  const [newApiKey, setNewApiKey] = useState('');
  const [uploadMode, setUploadMode] = useState<UploadMode>('replace');
  const [dragActive, setDragActive] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [sourceText, setSourceText] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [rows, setRows] = useState<NameRow[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sortField, setSortField] = useState<SortField>('count');
  const [sortAsc, setSortAsc] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('nametxt');
  const [page, setPage] = useState(1);
  const [pageJump, setPageJump] = useState('1');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<ProgressState>({ ratio: 0, label: 'Chờ' });
  const [extractionState, setExtractionState] = useState<ExtractionState>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const normalizedSettings = useMemo(() => normalizeExtractionSettings(settings), [settings]);
  const chunks = useMemo(
    () => (sourceText.trim() ? splitIntoChunks(sourceText.trim(), normalizedSettings) : []),
    [normalizedSettings, sourceText],
  );
  const usageEstimate = useMemo(
    () => estimateUsage({
      text: sourceText,
      chunks,
      rows,
      modelId: selectedModel,
      tierId: normalizedSettings.tierId,
    }),
    [chunks, normalizedSettings.tierId, rows, selectedModel, sourceText],
  );
  const activeRateLimits = useMemo(
    () => getRateLimits(selectedModel, normalizedSettings.tierId),
    [normalizedSettings.tierId, selectedModel],
  );
  const guideEstimate = useMemo(() => getGuideNovelEstimate(), []);
  const usableApiKeys = useMemo(() => {
    const migrated = legacyApiKey ? [legacyApiKey] : [];
    const storedKeys = Array.isArray(apiKeys) ? apiKeys : [];
    return [...new Set([...storedKeys, ...migrated].map((key) => String(key).trim()).filter(Boolean))];
  }, [apiKeys, legacyApiKey]);
  const visibleRows = useMemo(() => {
    let next = [...rows];
    const query = search.trim().toLowerCase();
    if (query) {
      next = next.filter((row) => (
        row.chinese.includes(query) ||
        row.hanviet.toLowerCase().includes(query) ||
        row.description.toLowerCase().includes(query)
      ));
    }
    if (category) next = next.filter((row) => row.category === category);

    next.sort((a, b) => {
      const left = a[sortField];
      const right = b[sortField];
      const result = typeof left === 'number'
        ? left - Number(right)
        : String(left || '').localeCompare(String(right || ''), 'vi');
      return sortAsc ? result : -result;
    });
    return next;
  }, [category, rows, search, sortAsc, sortField]);

  const exportValue = useMemo(() => (
    visibleRows.map((row) => `${formatQuickTranslatorName(row.chinese)}=${row.hanviet}`).join('\n')
  ), [visibleRows]);
  const normalizedPageSize = clampNumber(pageSize, 10, 500, 20);
  const totalPages = Math.max(1, Math.ceil(visibleRows.length / normalizedPageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * normalizedPageSize;
    return visibleRows.slice(start, start + normalizedPageSize);
  }, [currentPage, normalizedPageSize, visibleRows]);
  const pageButtons = useMemo(() => getPageButtons(currentPage, totalPages), [currentPage, totalPages]);
  const extractionRunKey = useMemo(
    () => buildExtractionRunKey(sourceText, selectedModel, normalizedSettings),
    [normalizedSettings, selectedModel, sourceText],
  );
  const canResumeExtraction = extractionState?.status === 'failed' &&
    extractionState.runKey === extractionRunKey &&
    extractionState.completed < extractionState.total;

  async function runExtraction() {
    if (busy) return;
    if (usableApiKeys.length === 0) {
      showToast('Nhập ít nhất 1 Gemini API key trước khi trích xuất.', true);
      return;
    }
    if (!sourceText.trim()) {
      showToast('Dán hoặc tải raw text tiếng Trung trước khi trích xuất.', true);
      return;
    }

    const initialChunkResults = canResumeExtraction ? extractionState.chunkResults : [];
    const initialCompleted = countCompletedChunks(initialChunkResults);

    setBusy(true);
    if (!canResumeExtraction) setRows([]);
    setProgress({
      ratio: getProgressRatio(initialCompleted, chunks.length),
      label: `${initialCompleted}/${chunks.length}`,
    });

    try {
      const collected = await extractChunksWithQueue({
        apiKeys: usableApiKeys,
        modelId: selectedModel,
        chunks,
        settings: normalizedSettings,
        initialChunkResults,
        onProgress: ({ completed, total, rows: collectedRows, chunkResults, statusLabel }) => {
          setProgress({ ratio: getProgressRatio(completed, total), label: statusLabel || `${completed}/${total}` });
          setRows(mergeRows(collectedRows, sourceText, { exactCounts: false }));
          setExtractionState({
            status: 'running',
            runKey: extractionRunKey,
            completed,
            total,
            chunkResults,
          });
        },
      });

      const merged = mergeRows(collected, sourceText);
      setRows(merged);
      setProgress({ ratio: 1, label: 'Xong' });
      setExtractionState(null);
      showToast(`Đã trích xuất ${merged.length} tên không trùng.`);
    } catch (error) {
      console.error(error);
      const extractionError = toExtractionError(error);
      const failedState = extractionError.extractionState;
      if (failedState) {
        const mergedRows = mergeRows(failedState.rows, sourceText);
        const failedChunkIndex = failedState.failedChunkIndex;
        const failedChunkLabel = Number.isInteger(failedChunkIndex)
          ? `Lỗi chunk ${Number(failedChunkIndex) + 1}/${failedState.total}`
          : `Lỗi ${failedState.completed}/${failedState.total}`;
        setRows(mergedRows);
        setProgress({
          ratio: getProgressRatio(failedState.completed, failedState.total),
          label: failedChunkLabel,
        });
        setExtractionState({
          status: 'failed',
          runKey: extractionRunKey,
          completed: failedState.completed,
          total: failedState.total,
          chunkResults: failedState.chunkResults,
        });
      } else {
        setProgress({ ratio: 0, label: 'Lỗi' });
        setExtractionState(null);
      }
      showToast(extractionError.message || 'Gọi Gemini thất bại.', true);
    } finally {
      setBusy(false);
    }
  }

  async function pasteFromClipboard() {
    try {
      updateSourceText(await navigator.clipboard.readText());
    } catch {
      showToast('Trình duyệt chặn clipboard. Hãy dán thủ công bằng Ctrl+V.', true);
    }
  }

  async function importTextFile(file?: File) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.txt')) {
      showToast('Chỉ hỗ trợ file .txt', true);
      return;
    }

    try {
      const text = await file.text();
      setExtractionState(null);
      setSourceText((current) => {
        if (uploadMode === 'append' && current.trim()) {
          return `${current.replace(/\s*$/, '')}\n\n${text}`;
        }
        return text;
      });
      showToast(`${uploadMode === 'append' ? 'Đã nối thêm' : 'Đã tải'} ${file.name}`);
    } catch {
      showToast('Không đọc được file text.', true);
    }
  }

  function handleTextDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragActive(false);
    importTextFile(event.dataTransfer.files?.[0]);
  }

  async function copyExport() {
    if (!exportValue) return;
    try {
      await navigator.clipboard.writeText(exportValue);
      showToast('Đã copy nội dung xuất file.');
    } catch {
      showToast('Không copy được vào clipboard.', true);
    }
  }

  function downloadExport() {
    if (!exportValue) {
      showToast('Chưa có nội dung để xuất file.', true);
      return;
    }
    const blob = new Blob([exportValue], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = getExportFilename(exportFormat);
    link.click();
    URL.revokeObjectURL(url);
  }

  function clearAll() {
    setSourceText('');
    setRows([]);
    setProgress({ ratio: 0, label: 'Chờ' });
    setExtractionState(null);
  }

  function updateSourceText(value: string) {
    setSourceText(value);
    setExtractionState((current) => (
      current?.runKey === buildExtractionRunKey(value, selectedModel, normalizedSettings) ? current : null
    ));
  }

  function sortBy(field: SortField) {
    if (sortField === field) {
      setSortAsc((value) => !value);
    } else {
      setSortField(field);
      setSortAsc(field !== 'count');
    }
  }

  function setSafePage(nextPage: number | string) {
    const resolved = clampNumber(nextPage, 1, totalPages, 1);
    setPage(resolved);
    setPageJump(String(resolved));
  }

  function updateSearch(value: string) {
    setSearch(value);
    setSafePage(1);
  }

  function updateCategory(value: string) {
    setCategory(value);
    setSafePage(1);
  }

  function updatePageSize(value: string) {
    const resolved = String(clampNumber(value, 10, 500, 20));
    setPageSize(resolved);
    setSafePage(1);
  }

  function showToast(message: string, error = false) {
    setToast({ message, error });
    window.clearTimeout(showToastTimeout);
    showToastTimeout = window.setTimeout(() => setToast(null), 3200);
  }

  function updateSetting(key: SettingsPatchKey, value: string | number) {
    setSettings((current) => normalizeExtractionSettings({
      ...current,
      [key]: value,
    }));
  }

  function addApiKey() {
    const key = newApiKey.trim();
    if (!key) return;
    setApiKeys((current) => [...new Set([...current, key])]);
    setLegacyApiKey('');
    setNewApiKey('');
  }

  function removeApiKey(key: string) {
    setApiKeys((current) => current.filter((item) => item !== key));
    if (legacyApiKey === key) setLegacyApiKey('');
  }

  return (
    <div className="flex h-screen min-w-80 flex-col overflow-hidden bg-background text-foreground">
      <AppHeader
        apiKeyCount={usableApiKeys.length}
        busy={busy}
        selectedModel={selectedModel}
        onGuideOpen={() => setGuideOpen(true)}
        onModelChange={setSelectedModel}
      />
      <MetricsBar
        chunks={chunks}
        progress={progress}
        rows={rows}
        selectedModel={selectedModel}
        sourceText={sourceText}
        usageEstimate={usageEstimate}
      />

      <main className="grid min-h-0 flex-1 grid-cols-[minmax(320px,0.95fr)_minmax(460px,1.55fr)_minmax(280px,0.8fr)] gap-3 p-3">
        <SourcePanel
          activeRateLimits={activeRateLimits}
          busy={busy}
          canResumeExtraction={canResumeExtraction}
          dragActive={dragActive}
          newApiKey={newApiKey}
          normalizedSettings={normalizedSettings}
          progress={progress}
          showKey={showKey}
          sourceText={sourceText}
          uploadMode={uploadMode}
          usableApiKeys={usableApiKeys}
          usageEstimate={usageEstimate}
          onAddApiKey={addApiKey}
          onClear={clearAll}
          onDragActiveChange={setDragActive}
          onDrop={handleTextDrop}
          onImportFile={importTextFile}
          onNewApiKeyChange={setNewApiKey}
          onPaste={pasteFromClipboard}
          onPreviewOpen={() => setPreviewOpen(true)}
          onRemoveApiKey={removeApiKey}
          onResetSettings={setSettings}
          onRun={runExtraction}
          onSettingChange={updateSetting}
          onShowKeyToggle={() => setShowKey((value) => !value)}
          onSourceTextChange={updateSourceText}
          onUploadModeChange={setUploadMode}
        />

        <ResultsPanel
          category={category}
          currentPage={currentPage}
          normalizedPageSize={normalizedPageSize}
          pageButtons={pageButtons}
          pageJump={pageJump}
          pagedRows={pagedRows}
          search={search}
          totalPages={totalPages}
          visibleRows={visibleRows}
          onCategoryChange={updateCategory}
          onPageJumpApply={() => setSafePage(pageJump)}
          onPageJumpChange={setPageJump}
          onPageSelect={setSafePage}
          onPageSizeChange={updatePageSize}
          onSearchChange={updateSearch}
          onSort={sortBy}
        />

        <ExportPanel
          exportFormat={exportFormat}
          exportValue={exportValue}
          onCopy={copyExport}
          onDownload={downloadExport}
          onFormatChange={setExportFormat}
        />
      </main>

      <Toast toast={toast} />
      {guideOpen && (
        <GuideDialog estimate={guideEstimate} tiers={TIER_OPTIONS} onClose={() => setGuideOpen(false)} />
      )}
      {previewOpen && (
        <RawPreviewDialog sourceText={sourceText} onClose={() => setPreviewOpen(false)} />
      )}
    </div>
  );
}

let showToastTimeout: number | undefined;

function getExportFilename(format: ExportFormat) {
  if (format === 'names2txt') return 'Names2.txt';
  return 'Names.txt';
}

function toExtractionError(error: unknown): Error & {
  extractionState?: {
    completed: number;
    total: number;
    failedChunkIndex?: number;
    chunkResults: Array<NameRow[] | null>;
    rows: NameRow[];
  };
} {
  return error instanceof Error ? error : new Error(String(error));
}
