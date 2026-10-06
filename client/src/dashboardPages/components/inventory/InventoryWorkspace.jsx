// client/src/dashboardPages/components/inventory/InventoryWorkspace.jsx
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import useDebounce from '../../../shared/hooks/useDebounce.js';
import useFetch from '../../../shared/hooks/useFetch.js';
import Pagination from '../../../shared/ui/Pagination.jsx';
import { useUiStore } from '../../store/uiStore.js';
import ViewToggle from '../ViewToggle.jsx';
import EditInventoryModal from './EditInventoryModal.jsx';

/**
 * Shared page shell for Car / Bike inventory.
 * api = { list, update, adjust, remove, brands, categories }
 */
export default function InventoryWorkspace({ title, subtitle, catalogPath, api, Filters, Table, Grid }) {
  // ?q=OEM (from the catalog's "Manage" link) pre-fills the search
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({ q: searchParams.get('q') ?? '', vehicleBrand: '', category: '', stockStatus: '', page: 1 });
  const [editing, setEditing] = useState(null);
  const [options, setOptions] = useState({ brands: [], categories: [] });
  const viewMode = useUiStore((s) => s.viewMode);
  const q = useDebounce(filters.q);

  useEffect(() => {
    Promise.all([api.brands(), api.categories()])
      .then(([b, c]) => setOptions({ brands: b.data, categories: c.data.map((x) => x.name) }))
      .catch(() => {});
  }, [api]);

  const params = { ...filters, q, limit: viewMode === 'grid' ? 24 : 20 };
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== ''));
  const { data, meta, loading, reload } = useFetch(() => api.list(clean), [JSON.stringify(clean)]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="text-sm text-slate-500">{meta ? `${meta.total} parts` : subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle />
          <Link to={catalogPath} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            <Plus className="h-4 w-4" /> Add from catalog
          </Link>
        </div>
      </div>

      <Filters filters={filters} onChange={setFilters} brands={options.brands} categories={options.categories} />

      {viewMode === 'grid'
        ? <Grid rows={data ?? []} loading={loading} onEdit={setEditing} />
        : <Table rows={data ?? []} loading={loading} onEdit={setEditing} />}

      <Pagination meta={meta} onPageChange={(page) => setFilters({ ...filters, page })} />
      <EditInventoryModal item={editing} onClose={() => setEditing(null)} onSaved={reload} api={api} />
    </div>
  );
}