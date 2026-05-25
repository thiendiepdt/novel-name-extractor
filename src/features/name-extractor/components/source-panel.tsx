import type { DragEvent } from 'react';
import { Clipboard, Eye, Loader2, Play, RotateCcw, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import type { ExtractionSettings, RateLimits } from '@/lib/gemini';
import { TEXTAREA_CHAR_LIMIT } from '../constants';
import { getRawPreviewText } from '../lib/extraction-session';
import type { ProgressState, SettingsPatchKey, UploadMode, UsageEstimate } from '../types';
import { SettingsPanel } from './settings-panel';

export function SourcePanel({
  activeRateLimits,
  busy,
  canResumeExtraction,
  dragActive,
  newApiKey,
  normalizedSettings,
  progress,
  selectedModel,
  selectedProviderLabel,
  showKey,
  sourceText,
  uploadMode,
  usageEstimate,
  usableApiKeys,
  onAddApiKey,
  onClear,
  onDrop,
  onDragActiveChange,
  onImportFile,
  onNewApiKeyChange,
  onPaste,
  onPreviewOpen,
  onRemoveApiKey,
  onResetSettings,
  onRun,
  onSettingChange,
  onShowKeyToggle,
  onSourceTextChange,
  onUploadModeChange,
}: {
  activeRateLimits: RateLimits;
  busy: boolean;
  canResumeExtraction: boolean;
  dragActive: boolean;
  newApiKey: string;
  normalizedSettings: ExtractionSettings;
  progress: ProgressState;
  selectedModel: string;
  selectedProviderLabel: string;
  showKey: boolean;
  sourceText: string;
  uploadMode: UploadMode;
  usageEstimate: UsageEstimate;
  usableApiKeys: string[];
  onAddApiKey: () => void;
  onClear: () => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
  onDragActiveChange: (active: boolean) => void;
  onImportFile: (file?: File) => void;
  onNewApiKeyChange: (value: string) => void;
  onPaste: () => void;
  onPreviewOpen: () => void;
  onRemoveApiKey: (key: string) => void;
  onResetSettings: (settings: ExtractionSettings) => void;
  onRun: () => void;
  onSettingChange: (key: SettingsPatchKey, value: string | number) => void;
  onShowKeyToggle: () => void;
  onSourceTextChange: (value: string) => void;
  onUploadModeChange: (mode: UploadMode) => void;
}) {
  const useStaticRawPreview = sourceText.length > TEXTAREA_CHAR_LIMIT;
  const rawPreviewText = getRawPreviewText(sourceText);

  return (
    <Card
      className={`relative flex min-h-0 flex-col overflow-hidden ${dragActive ? 'ring-2 ring-primary' : ''}`}
      onDragEnter={(event) => {
        event.preventDefault();
        onDragActiveChange(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onDragActiveChange(false);
      }}
      onDrop={onDrop}
    >
      <CardHeader className="flex-wrap gap-2 p-2">
        <CardTitle className="min-w-0 flex-1 truncate">Raw Text Tiếng Trung</CardTitle>
        <div className="flex w-full flex-wrap items-center justify-end gap-1.5 min-[420px]:w-auto">
          <div className="flex rounded-md bg-muted p-1">
            <Button
              variant={uploadMode === 'replace' ? 'default' : 'ghost'}
              className="h-7 px-2"
              onClick={() => onUploadModeChange('replace')}
              disabled={busy}
            >
              Thay thế
            </Button>
            <Button
              variant={uploadMode === 'append' ? 'default' : 'ghost'}
              className="h-7 px-2"
              onClick={() => onUploadModeChange('append')}
              disabled={busy}
            >
              Nối thêm
            </Button>
          </div>
          <label className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-border bg-secondary px-2.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80">
            <Upload className="h-4 w-4" />
            Tải file
            <input
              type="file"
              accept=".txt,text/plain"
              className="hidden"
              disabled={busy}
              onChange={(event) => {
                onImportFile(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </label>
          <Button variant="secondary" onClick={onPaste} disabled={busy}>
            <Clipboard className="h-4 w-4" />
            Dán
          </Button>
        </div>
      </CardHeader>

      {useStaticRawPreview ? (
        <div className="min-h-0 flex-1 overflow-hidden border-t border-border bg-background">
          <div className="flex items-center justify-between border-b border-border px-3 py-2 text-xs text-muted-foreground">
            <span>{sourceText.length.toLocaleString()} ký tự. Đã tắt textarea để tránh lag.</span>
            <Button variant="secondary" onClick={onPreviewOpen}>
              <Eye className="h-4 w-4" />
              Xem preview
            </Button>
          </div>
          <pre className="h-full overflow-hidden whitespace-pre-wrap p-4 font-mono text-sm leading-7 text-foreground">
            {rawPreviewText}
          </pre>
        </div>
      ) : (
        <Textarea
          value={sourceText}
          onChange={(event) => onSourceTextChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.ctrlKey && event.key === 'Enter') {
              event.preventDefault();
              onRun();
            }
          }}
          spellCheck={false}
          placeholder="Dán raw text truyện Trung vào đây, hoặc kéo thả file .txt..."
          className="min-h-0 flex-1 resize-none rounded-none border-0 font-mono leading-7 focus-visible:ring-0"
        />
      )}

      {dragActive && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-background/75 text-sm font-semibold text-primary">
          Thả file .txt để {uploadMode === 'append' ? 'nối thêm' : 'thay thế'}
        </div>
      )}
      <div className="flex gap-2 border-t border-border p-3">
        <Button className="flex-1" onClick={onRun} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {busy ? 'Đang lọc...' : canResumeExtraction ? 'Thử lại từ lỗi' : 'Trích xuất'}
        </Button>
        <Button className="flex-1" variant="secondary" onClick={onClear} disabled={busy}>
          <RotateCcw className="h-4 w-4" />
          Xóa
        </Button>
      </div>
      <div className="h-1 bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${Math.round(progress.ratio * 100)}%` }} />
      </div>
      <SettingsPanel
        activeRateLimits={activeRateLimits}
        apiKeys={usableApiKeys}
        busy={busy}
        newApiKey={newApiKey}
        normalizedSettings={normalizedSettings}
        selectedModel={selectedModel}
        selectedProviderLabel={selectedProviderLabel}
        showKey={showKey}
        usageEstimate={usageEstimate}
        onAddApiKey={onAddApiKey}
        onNewApiKeyChange={onNewApiKeyChange}
        onRemoveApiKey={onRemoveApiKey}
        onResetSettings={onResetSettings}
        onSettingChange={onSettingChange}
        onShowKeyToggle={onShowKeyToggle}
      />
    </Card>
  );
}
