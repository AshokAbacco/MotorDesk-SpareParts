// client/src/landingPages/shop/components/SearchBar.jsx
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

/** Global search: part name, OEM number, brand or vehicle model */
export default function SearchBar({ size = 'md' }) {
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const navigate = useNavigate();

  useEffect(() => { setQ(params.get('q') ?? ''); }, [params]);

  const onSubmit = (e) => {
    e.preventDefault();
    const next = new URLSearchParams(params);
    if (q.trim()) next.set('q', q.trim()); else next.delete('q');
    next.delete('page');
    navigate(`/shop?${next.toString()}`);
  };

  return (
    <form onSubmit={onSubmit} className="relative w-full max-w-xl">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search part name, OEM number or vehicle…"
        // text-slate-900: always dark text, even inside the white-text hero banner on the home page
        className={`field pl-9 text-slate-900 ${size === 'lg' ? 'py-3 text-base' : ''}`}
        aria-label="Search parts"
      />
    </form>
  );
}