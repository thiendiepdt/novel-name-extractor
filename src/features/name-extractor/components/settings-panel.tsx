import { Eye, EyeOff, KeyRound, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DEFAULT_EXTRACTION_SETTINGS, TIER_OPTIONS } from '@/lib/gemini';
import type { ExtractionSettings, RateLimits } from '@/lib/gemini';
import { compactNumber, formatUsd, maskApiKey } from '../lib/format';
import type { SettingsPatchKey, UsageEstimate } from '../types';

export function SettingsPanel({
  activeRateLimits,
  apiKeys,
  busy,
  newApiKey,
  normalizedSettings,
  showKey,
  usageEstimate,
  onAddApiKey,
  onNewApiKeyChange,
  onRemoveApiKey,
  onResetSettings,
  onSettingChange,
  onShowKeyToggle,
}: {
  activeRateLimits: RateLimits;
  apiKeys: string[];
  busy: boolean;
  newApiKey: string;
  normalizedSettings: ExtractionSettings;
  showKey: boolean;
  usageEstimate: UsageEstimate;
  onAddApiKey: () => void;
  onNewApiKeyChange: (value: string) => void;
  onRemoveApiKey: (key: string) => void;
  onResetSettings: (settings: ExtractionSettings) => void;
  onSettingChange: (key: SettingsPatchKey, value: string | number) => void;
  onShowKeyToggle: () => void;
}) {
  return (
    <div className="border-t border-border p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <SlidersHorizontal className="h-4 w-4 text-primary" />
        Cài đặt
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5 rounded-md border border-border bg-background/60 p-2 text-xs text-muted-foreground">
        <EstimateItem label="Vào" value={`~${usageEstimate.inputTokens.toLocaleString()}`} />
        <EstimateItem label="Ra" value={`~${usageEstimate.outputTokens.toLocaleString()}`} />
        <EstimateItem label="Phí" value={`~${formatUsd(usageEstimate.totalCost)}`} />
        <EstimateItem label="RPM" value={activeRateLimits.rpm.toLocaleString()} />
        <EstimateItem label="TPM" value={compactNumber(activeRateLimits.tpm)} />
        <EstimateItem label="RPD" value={compactNumber(activeRateLimits.rpd)} />
      </div>
      <ApiKeyManager
        apiKeys={apiKeys}
        newApiKey={newApiKey}
        showKey={showKey}
        onAdd={onAddApiKey}
        onChange={onNewApiKeyChange}
        onRemove={onRemoveApiKey}
        onShowKeyToggle={onShowKeyToggle}
      />
      <div className="grid grid-cols-2 gap-2">
        <SegmentedSetting
          label="Kiểu truyện"
          options={[
            { label: 'Đông phương', value: 'eastern' },
            { label: 'Tây phương', value: 'western' },
          ]}
          value={normalizedSettings.nameStyle}
          disabled={busy}
          onChange={(value) => onSettingChange('nameStyle', value)}
        />
        <SegmentedSetting
          label="Quota"
          options={TIER_OPTIONS.map((tier) => ({ label: tier.label, value: tier.id }))}
          value={normalizedSettings.tierId}
          disabled={busy}
          onChange={(value) => onSettingChange('tierId', value)}
        />
        <SegmentedSetting
          label="Độ phủ"
          options={[
            { label: 'Cao', value: 'high' },
            { label: 'Cân bằng', value: 'balanced' },
          ]}
          value={normalizedSettings.recallMode}
          disabled={busy}
          onChange={(value) => onSettingChange('recallMode', value)}
        />
        <SegmentedSetting
          label="Mô tả"
          options={[
            { label: 'Có mô tả', value: 'full' },
            { label: 'Không mô tả', value: 'none' },
          ]}
          value={normalizedSettings.descriptionMode}
          disabled={busy}
          onChange={(value) => onSettingChange('descriptionMode', value)}
        />
        <NumberSetting
          label="Cỡ chunk"
          value={normalizedSettings.chunkSize}
          min={1000}
          max={30000}
          step={500}
          disabled={busy}
          onChange={(value) => onSettingChange('chunkSize', value)}
        />
        <NumberSetting
          label="Lặp lại"
          value={normalizedSettings.chunkOverlap}
          min={0}
          max={2000}
          step={50}
          disabled={busy}
          onChange={(value) => onSettingChange('chunkOverlap', value)}
        />
        <NumberSetting
          label="Song song"
          value={normalizedSettings.maxConcurrent}
          min={1}
          max={8}
          disabled={busy}
          onChange={(value) => onSettingChange('maxConcurrent', value)}
        />
        <NumberSetting
          label="Thử lại"
          value={normalizedSettings.maxRetries}
          min={0}
          max={8}
          disabled={busy}
          onChange={(value) => onSettingChange('maxRetries', value)}
        />
        <div className="col-span-2 grid grid-cols-2 gap-2">
          <NumberSetting
            label="Timeout (s)"
            value={normalizedSettings.requestTimeoutSeconds}
            min={5}
            max={180}
            step={5}
            disabled={busy}
            onChange={(value) => onSettingChange('requestTimeoutSeconds', value)}
          />
          <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-2">
            <span aria-hidden="true" />
            <Button
              variant="secondary"
              className="h-8"
              disabled={busy}
              onClick={() => onResetSettings(DEFAULT_EXTRACTION_SETTINGS)}
            >
              Mặc định
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ApiKeyManager({
  apiKeys,
  newApiKey,
  showKey,
  onAdd,
  onChange,
  onRemove,
  onShowKeyToggle,
}: {
  apiKeys: string[];
  newApiKey: string;
  showKey: boolean;
  onAdd: () => void;
  onChange: (value: string) => void;
  onRemove: (key: string) => void;
  onShowKeyToggle: () => void;
}) {
  return (
    <div className="mb-3 grid gap-2 rounded-md border border-border bg-background/60 p-2">
      <div className="grid grid-cols-[1fr_auto_auto] gap-2">
        <div className="relative">
          <KeyRound className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            id="apiKey"
            type={showKey ? 'text' : 'password'}
            value={newApiKey}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                onAdd();
              }
            }}
            autoComplete="off"
            className="h-8 pl-7 text-xs"
            placeholder="Dán API key"
          />
        </div>
        <Button variant="secondary" size="icon" onClick={onShowKeyToggle} title="Show or hide API key">
          {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </Button>
        <Button variant="secondary" onClick={onAdd} disabled={!newApiKey.trim()}>
          <Plus className="h-3.5 w-3.5" />
          Thêm
        </Button>
      </div>
      <div className="flex max-h-16 flex-wrap gap-1 overflow-auto">
        {apiKeys.length === 0 ? (
          <span className="text-xs text-muted-foreground">Chưa thêm key nào.</span>
        ) : apiKeys.map((key, index) => (
          <span key={key} className="inline-flex max-w-full items-center gap-1 rounded border border-border bg-card px-1.5 py-0.5 text-xs">
            <span className="font-mono text-muted-foreground">#{index + 1}</span>
            <span className="max-w-36 truncate font-mono text-foreground">{maskApiKey(key)}</span>
            <button className="text-muted-foreground hover:text-foreground" onClick={() => onRemove(key)} title="Xóa key">
              <Trash2 className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

function SegmentedSetting({
  label,
  options,
  value,
  disabled,
  onChange,
}: {
  label: string;
  options: Array<{ label: string; value: string }>;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="col-span-2 grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-2 text-xs text-muted-foreground">
      <span className="truncate">{label}</span>
      <div className="grid grid-cols-2 rounded-md bg-muted p-1">
        {options.map((option) => (
          <Button
            key={option.value}
            variant={value === option.value ? 'default' : 'ghost'}
            className="h-8"
            disabled={disabled}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function EstimateItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="inline-flex min-w-0 items-center gap-1 rounded border border-border bg-card px-1.5 py-0.5">
      <span>{label}</span>
      <strong className="truncate font-mono text-foreground">{value}</strong>
    </div>
  );
}

function NumberSetting({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
}) {
  return (
    <label className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-2 text-xs text-muted-foreground">
      <span className="truncate">{label}</span>
      <Input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 font-mono text-xs"
      />
    </label>
  );
}
