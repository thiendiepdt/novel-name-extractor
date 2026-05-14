import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type RawPreviewDialogProps = {
  sourceText: string;
  onClose: () => void;
};

export function RawPreviewDialog({ sourceText, onClose }: RawPreviewDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground">
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div>
          <h2 className="text-base font-semibold">Preview Raw Text</h2>
          <p className="text-xs text-muted-foreground">{sourceText.length.toLocaleString()} ký tự</p>
        </div>
        <Button variant="secondary" onClick={onClose}>
          <X className="h-4 w-4" />
          Đóng
        </Button>
      </div>
      <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap p-5 font-mono text-sm leading-7">
        {sourceText}
      </pre>
    </div>
  );
}
