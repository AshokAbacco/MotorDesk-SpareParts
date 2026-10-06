// client/src/dashboardPages/components/inventory/CatalogWorkspace.jsx
import { ArrowUpRight, EyeOff, Pencil, Plus, RotateCcw, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import useAuth from '../../../shared/hooks/useAuth.js';
import useDebounce from '../../../shared/hooks/useDebounce.js';
import useFetch from '../../../shared/hooks/useFetch.js';
import Button from '../../../shared/ui/Button.jsx';
import Input from '../../../shared/ui/Input.jsx';
import Pagination from '../../../shared/ui/Pagination.jsx';
import Select from '../../../shared/ui/Select.jsx';
import Table from '../../../shared/ui/Table.jsx';
import { formatCurrency } from '../../../shared/utils/formatCurrency.js';
import ProductForm from '../../admin/components/ProductForm.jsx';
import { deactivateProduct, updateProduct } from '../../admin/products.api.js';
import AddToInventoryModal from './AddToInventoryModal.jsx';
import { fitmentText } from './InventoryTableBase.jsx';

// "All parts" / "Master catalog" = parts this shop can still add (already-added parts are left out)
// "My products" = parts this shop has added & priced, plus the parts it created itself
const OWNER_TABS = [
  { value: '', label: 'All parts', hint: 'Parts you haven’t added yet. Add one to set your price & stock — it then moves to “My products”.' },
  { value: 'MASTER', label: 'Master catalog', hint: 'MotorDesk catalog parts you haven’t added yet.' },
  { value: 'MINE', label: 'My products', hint: 'Parts you sell (with your price & stock) and parts you created.' },
];

/**
 * Car / Bike parts catalog for vendors.
 * Pick parts from the master catalog, or add your own with "New product" (same form the admin uses).
 * Only products your shop added can be edited or hidden — master and other shops' products are untouched.
 * api = { catalog(params), add(body), brands(), models(brand) } · vehicleType = 'CAR' | 'BIKE'
 */
export default function CatalogWorkspace({ title, api, vehicleType }) {
  const inventoryPath = `/vendor/inventory/${vehicleType === 'BIKE' ? 'bike' : 'car'}`;
  const { vendor } = useAuth();
  const [filters, setFilters] = useState({ q: '', vehicleBrand: '', vehicleModel: '', owner: '', page: 1 });
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [adding, setAdding] = useState(null);
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new product, object = edit
  const [busyId, setBusyId] = useState('');
  const q = useDebounce(filters.q);

  const loadBrands = () => api.brands().then((r) => setBrands(r.data)).catch(() => {});
  useEffect(() => { loadBrands(); }, [api]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setModels([]);
    if (filters.vehicleBrand) api.models(filters.vehicleBrand).then((r) => setModels(r.data)).catch(() => {});
  }, [api, filters.vehicleBrand]);

  const params = Object.fromEntries(Object.entries({ ...filters, q }).filter(([, v]) => v !== ''));
  const { data, meta, loading, reload } = useFetch(() => api.catalog(params), [JSON.stringify(params)]);

  const isMine = (p) => Boolean(vendor?.id) && p.vendorId === vendor.id;

  const toggleActive = async (p) => {
    if (p.isActive && !window.confirm(`Hide "${p.name}"? It will disappear from your catalog and the marketplace. You can restore it from "My products".`)) return;
    setBusyId(p.id);
    try {
      if (p.isActive) await deactivateProduct(p.id); else await updateProduct(p.id, { isActive: true });
      toast.success(p.isActive ? 'Product hidden' : 'Product restored');
      reload();
    } catch (e) { toast.error(e.message); } finally { setBusyId(''); }
  };

  // After creating a product, go straight to setting price & stock for it
  const onSaved = (product, { created }) => {
    reload();
    loadBrands(); // a new vehicle brand may have been added from the form

    if (created) setAdding(product);
  };

  const columns = [
    {
      key: 'name', header: 'Part',
      render: (p) => (
        <div className="flex items-center gap-3">
          {p.images?.[0] ? <img src={p.images[0]} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" /> : <div className="h-9 w-9 shrink-0 rounded-md bg-slate-100" />}
          <div>
            <p className="font-medium text-slate-800">{p.name}</p>
            <p className="font-mono text-xs text-slate-500">{p.oemNumber}</p>
            {isMine(p) && (
              <span className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${p.isActive ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-500'}`}>
                {p.isActive ? 'Your product' : 'Hidden'}
              </span>
            )}
          </div>
        </div>
      ),
    },
    { key: 'brand', header: 'Brand' },
    { key: 'category', header: 'Category', className: '!whitespace-normal min-w-[8rem]', render: (p) => `${p.category}${p.subCategory ? ` / ${p.subCategory}` : ''}` },
    { key: 'fits', header: 'Fits', className: '!whitespace-normal min-w-[10rem] max-w-xs', render: (p) => <span className="text-xs">{fitmentText(p, 3)}</span> },
    { key: 'gst', header: 'GST', render: (p) => `${Number(p.gstRate)}%` },
    // My products: this shop's own price & stock
    ...(filters.owner === 'MINE' ? [{
      key: 'mine', header: 'Your price · stock',
      render: (p) => (p.myInventory ? (
        <div className="text-xs">
          <p className="font-medium text-slate-800">{formatCurrency(p.myInventory.price)} <span className="font-normal text-slate-400">+ GST</span></p>
          <p className={p.myInventory.stock > 0 ? 'text-slate-500' : 'text-red-600'}>
            {p.myInventory.stock > 0 ? `${p.myInventory.stock} in stock` : 'Out of stock'}{!p.myInventory.isListed && ' · not listed'}
          </p>
        </div>
      ) : <span className="text-xs text-amber-600">Price not set yet</span>),
    }] : []),
    {
      key: 'add', header: '', className: 'text-right',
      render: (p) => (
        <div className="flex items-center justify-end gap-1">
          {isMine(p) && (
            <>
              <button onClick={() => setEditing(p)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600" title="Edit" aria-label={`Edit ${p.name}`}><Pencil className="h-4 w-4" /></button>
              <button onClick={() => toggleActive(p)} disabled={busyId === p.id} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600 disabled:opacity-50" title={p.isActive ? 'Hide' : 'Restore'} aria-label={p.isActive ? `Hide ${p.name}` : `Restore ${p.name}`}>
                {p.isActive ? <EyeOff className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
              </button>
            </>
          )}
          {/* Added → manage price & stock in the inventory page · not added → Add (set price & stock) */}
          {p.myInventory
            ? <Link to={`${inventoryPath}?q=${encodeURIComponent(p.oemNumber)}`} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100">Manage <ArrowUpRight className="h-3.5 w-3.5" /></Link>
            : p.isActive && <button onClick={() => setAdding(p)} className="inline-flex items-center gap-1 rounded-lg border border-brand-200 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"><Plus className="h-3.5 w-3.5" /> {isMine(p) ? 'Set price' : 'Add'}</button>}
        </div>
      ),
    },
  ];

  const set = (patch) => setFilters({ ...filters, ...patch, page: 1 });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="text-sm text-slate-500">Pick parts from the catalog and set your own price & stock — or add a part that isn’t listed yet.</p>
        </div>
        <Button icon={Plus} onClick={() => setEditing(null)}>New product</Button>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {OWNER_TABS.map((t) => (
          <button key={t.value || 'all'} onClick={() => set({ owner: t.value })}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${filters.owner === t.value ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-500">{OWNER_TABS.find((t) => t.value === filters.owner)?.hint}</p>

      <div className="grid gap-3 sm:grid-cols-3">
        <Input icon={Search} placeholder="Search part or OEM number…" value={filters.q} onChange={(e) => set({ q: e.target.value })} aria-label="Search catalog" />
        <Select value={filters.vehicleBrand} onChange={(e) => set({ vehicleBrand: e.target.value, vehicleModel: '' })} options={brands} placeholder="All brands" aria-label="Brand" />
        <Select value={filters.vehicleModel} onChange={(e) => set({ vehicleModel: e.target.value })} options={models} placeholder="All models" disabled={!filters.vehicleBrand} aria-label="Model" />
      </div>
      <Table
        columns={columns}
        rows={data ?? []}
        loading={loading}
        empty={filters.owner === 'MINE' ? 'You haven’t added any parts yet — pick one under “All parts”, or use “New product”.' : 'Nothing left to add here — every matching part is already in “My products”.'}
      />
      <Pagination meta={meta} onPageChange={(page) => setFilters({ ...filters, page })} />

      <ProductForm open={editing !== undefined} product={editing} defaultType={vehicleType} onClose={() => setEditing(undefined)} onSaved={onSaved} />
      {adding && <AddToInventoryModal product={adding} onClose={() => setAdding(null)} addFn={api.add} onAdded={reload} />}
    </div>
  );
}