import { Loader2 } from 'lucide-react';

export default function Spinner({ label, fullScreen = false }) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
      <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
  return fullScreen ? <div className="flex min-h-screen items-center justify-center">{content}</div> : content;
}
