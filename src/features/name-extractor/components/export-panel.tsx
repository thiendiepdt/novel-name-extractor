import { Copy, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import type { ExportFormat } from '../types';

type ExportPanelProps = {
  exportFormat: ExportFormat;
  exportValue: string;
  onCopy: () => void;
  onDownload: () => void;
  onFormatChange: (format: ExportFormat) => void;
  className?: string;
};

export function ExportPanel({ className = '', exportFormat, exportValue, onCopy, onDownload, onFormatChange }: ExportPanelProps) {
  return (
    <Card className={`flex min-h-0 flex-col overflow-hidden ${className}`}>
      <CardHeader>
        <CardTitle>Xuất File</CardTitle>
        <div className="flex gap-1 rounded-md bg-muted p-1">
          <Button
            variant={exportFormat === 'nametxt' ? 'default' : 'ghost'}
            className="h-8"
            onClick={() => onFormatChange('nametxt')}
          >
            Names.txt
          </Button>
          <Button
            variant={exportFormat === 'names2txt' ? 'default' : 'ghost'}
            className="h-8"
            onClick={() => onFormatChange('names2txt')}
          >
            Names2.txt
          </Button>
        </div>
      </CardHeader>
      <Textarea
        value={exportValue}
        readOnly
        placeholder="Preview xuất file sẽ hiện sau khi trích xuất."
        className="min-h-0 flex-1 resize-none rounded-none border-0 font-mono text-xs leading-6 text-muted-foreground focus-visible:ring-0"
      />
      <div className="flex gap-2 border-t border-border p-3">
        <Button className="flex-1" variant="secondary" onClick={onCopy}>
          <Copy className="h-4 w-4" />
          Copy
        </Button>
        <Button className="flex-1" onClick={onDownload}>
          <Download className="h-4 w-4" />
          Tải về
        </Button>
      </div>
    </Card>
  );
}
