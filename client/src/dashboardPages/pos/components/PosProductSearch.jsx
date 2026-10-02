import { Plus, ScanLine } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import useDebounce from '../../../shared/hooks/useDebounce.js';
import Spinner from '../../../shared/ui/Spinner.jsx';
import { formatCurrency } from '../../../shared/utils/formatCurrency.js';
import { usePosCartStore } from '../../store/posCartStore.js';
import { searchPosItems } from '../pos.api.js';

export default function PosProductSearch() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounced = useDebounce(q, 300);
  const addLine = usePosCartStore((s) => s.addLine);
  const inputRef = useRef(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    searchPosItems(debounced)
      .then((r) => active && setResults(r.data))
      .catch(() => active && setResults([]))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [debounced]);

  // Enter adds the first match — works with barcode scanners that type OEM + Enter
  const onKeyDown = (e) => {
    if (e.key === 'Enter' && results[0]) { e.preventDefault(); addLine(results[0]); setQ(''); }
  };

  return (
    <div className="card flex h-full flex-col p-4">
      <div className="relative">
        <ScanLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input ref={inputRef} autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKeyDown}
          placeholder="Scan or search OEM / part / vehicle…" className="field pl-9" aria-label="Search parts" />
      </div>
      <div className="mt-3 max-h-[40vh] flex-1 overflow-y-auto lg:max-h-none">
        {loading ? <div className="py-8"><Spinner /></div> : results.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No in-stock parts match “{q}”.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {results.map((r) => (
              <li key={r.id}>
                <button onClick={() => { addLine(r); inputRef.current?.focus(); }} className="flex w-full items-center gap-3 px-1 py-2.5 text-left hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{r.product.name}</p>
                    <p className="font-mono text-xs text-slate-500">{r.product.oemNumber} · stock {r.stock}</p>
                  </div>
                  <span className="text-sm font-semibold">{formatCurrency(r.price)}</span>
                  <Plus className="h-4 w-4 text-brand-600" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
