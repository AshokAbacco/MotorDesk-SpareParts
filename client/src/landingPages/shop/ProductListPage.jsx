import { SearchX } from 'lucide-react';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import useFetch from '../../shared/hooks/useFetch.js';
import EmptyState from '../../shared/ui/EmptyState.jsx';
import Pagination from '../../shared/ui/Pagination.jsx';
import Select from '../../shared/ui/Select.jsx';
import Spinner from '../../shared/ui/Spinner.jsx';
import ProductCard from './components/ProductCard.jsx';
import ProductFilters from './components/ProductFilters.jsx';
import { getShopProducts } from './shop.api.js';

const FILTER_KEYS = ['vehicleType', 'vehicleBrand', 'vehicleModel', 'year', 'category'];
const SORTS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'newest', label: 'Newest' },
];

export default function ProductListPage() {
  const [params, setParams] = useSearchParams();
  const query = useMemo(() => Object.fromEntries([...params.entries()].filter(([, v]) => v)), [params]);
  const { data, meta, loading, error } = useFetch(() => getShopProducts(query), [params.toString()]);

  const update = (patch) => {
    const next = { ...query, ...patch };
    if (!('page' in patch)) delete next.page;
    setParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v)));
  };
  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, query[k] ?? '']));
  const onFilters = (f) => update({ ...Object.fromEntries(FILTER_KEYS.map((k) => [k, ''])), ...f });

  const heading = [query.vehicleBrand, query.vehicleModel, query.year].filter(Boolean).join(' ') || (query.vehicleType === 'BIKE' ? 'Bike parts' : query.vehicleType === 'CAR' ? 'Car parts' : 'All parts');

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">{query.q ? `Results for “${query.q}”` : heading}</h1>
          {meta && <p className="text-sm text-slate-500">{meta.total} parts found</p>}
        </div>
        <Select className="w-48" value={query.sort ?? 'relevance'} options={SORTS} onChange={(e) => update({ sort: e.target.value })} aria-label="Sort" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <ProductFilters filters={filters} onChange={onFilters} />
        <section>
          {loading ? (
            <div className="py-20"><Spinner label="Loading parts…" /></div>
          ) : error ? (
            <EmptyState title="Could not load parts" description={error} />
          ) : data.length === 0 ? (
            <EmptyState icon={SearchX} title="No parts match your search" description="Try a different vehicle, OEM number or remove some filters." />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                {data.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
              <Pagination meta={meta} onPageChange={(page) => update({ page: String(page) })} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
