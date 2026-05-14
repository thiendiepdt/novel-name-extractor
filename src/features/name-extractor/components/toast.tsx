import type { ToastState } from '../types';

export function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;

  return (
    <div className={`fixed bottom-4 right-4 max-w-md rounded-lg border bg-card px-4 py-3 text-sm shadow-lg ${toast.error ? 'border-destructive text-destructive-foreground' : 'border-border text-foreground'}`}>
      {toast.message}
    </div>
  );
}
