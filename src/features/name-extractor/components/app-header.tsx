import { HelpCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MODEL_OPTIONS } from '@/lib/gemini';

type AppHeaderProps = {
  selectedModel: string;
  apiKeyCount: number;
  busy: boolean;
  onModelChange: (modelId: string) => void;
  onGuideOpen: () => void;
};

export function AppHeader({ selectedModel, apiKeyCount, busy, onModelChange, onGuideOpen }: AppHeaderProps) {
  return (
    <header className="flex min-h-11 items-center justify-between gap-3 border-b border-border bg-card px-3 py-1.5">
      <div className="flex min-w-0 items-center gap-2">
        <Sparkles className="h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold leading-5 tracking-normal">Trích Xuất Tên Bằng AI</h1>
        </div>
        <Button variant="secondary" className="h-7 shrink-0 px-2" onClick={onGuideOpen} title="Hướng dẫn sử dụng">
          <HelpCircle className="h-4 w-4" />
          Hướng dẫn
        </Button>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="flex rounded-md border border-border bg-background p-0.5" role="radiogroup" aria-label="Chọn model AI">
          {MODEL_OPTIONS.map((model) => (
            <button
              key={model.id}
              type="button"
              role="radio"
              aria-checked={selectedModel === model.id}
              title={model.label}
              disabled={busy}
              onClick={() => onModelChange(model.id)}
              className={`h-7 rounded px-2.5 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 ${
                selectedModel === model.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {model.shortLabel}
            </button>
          ))}
        </div>
        <div className="rounded-md border border-border bg-background px-2 py-1 text-xs leading-4 text-muted-foreground">
          <span className="font-mono text-foreground">{apiKeyCount}</span> key
        </div>
      </div>
    </header>
  );
}
