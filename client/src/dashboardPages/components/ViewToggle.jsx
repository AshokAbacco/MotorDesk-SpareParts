import { LayoutGrid, List } from 'lucide-react';
import { useUiStore } from '../store/uiStore.js';

export default function ViewToggle() {
  const { viewMode, setViewMode } = useUiStore();
  return (
    <div className="flex rounded-lg border border-slate-300 bg-white p-0.5">
      {[['table', List, 'Table view'], ['grid', LayoutGrid, 'Grid view']].map(([mode, Icon, label]) => (
        <button key={mode} onClick={() => setViewMode(mode)} title={label} aria-label={label}
          className={`rounded-md p-1.5 ${viewMode === mode ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
