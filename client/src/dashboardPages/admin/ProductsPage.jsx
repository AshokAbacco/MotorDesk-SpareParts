// client/src/dashboardPages/admin/ProductsPage.jsx
import { Bike, Car, EyeOff, Pencil, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import useDebounce from '../../shared/hooks/useDebounce.js';
import useFetch from '../../shared/hooks/useFetch.js';
import Button from '../../shared/ui/Button.jsx';
import Input from '../../shared/ui/Input.jsx';
import Pagination from '../../shared/ui/Pagination.jsx';
import Select from '../../shared/ui/Select.jsx';
import Table from '../../shared/ui/Table.jsx';
import { fitmentText } from '../components/inventory/InventoryTableBase.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ProductForm from './components/ProductForm.jsx';
import { deactivateProduct, getProducts, updateProduct } from './products.api.js';

// Vehicle type pills for the "Type" column — worked out from the product's vehicle fitment
const TYPE_STYLE = {
  CAR: { label: 'Car', Icon: Car, cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
  BIKE: { label: 'Bike', Icon: Bike, cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
};

function VehicleTypeBadge({ product }) {
  const types = ['CAR', 'BIKE'].filter((t) => product.vehicleMappings?.some((m) => m.vehicle?.type === t));
  if (!types.length) return <span className="text-xs text-slate-400" title="No vehicle fitment">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {types.map((t) => {
        const { label, Icon, cls } = TYPE_STYLE[t];
        return (
          <span key={t} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}>
            <Icon className="h-3.5 w-3.5" /> {label}
          </span>
        );
      })}
    </div>
  );
}

export default function ProductsPage() {
  const [q, setQ] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [owner, setOwner] = useState(''); // '' all · MASTER · VENDOR (added by shops)
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new
  const query = useDebounce(q);

  const params = { page, ...(query && { q: query }), ...(vehicleType && { vehicleType }), ...(owner && { owner }) };
  const { data, meta, loading, reload } = useFetch(() => getProducts(params), [JSON.stringify(params)]);

  const toggleActive = async (p) => {
    try {
      if (p.isActive) await deactivateProduct(p.id); else await updateProduct(p.id, { isActive: true });
      toast.success(p.isActive ? 'Product hidden' : 'Product restored');
      reload();
    } catch (e) { toast.error(e.message); }
  };

  const columns = [
    { key: 'name', header: 'Product', render: (p) => <div className="flex items-center gap-3">{p.images[0] ? <img src={p.images[0]} alt="" className="h-9 w-9 rounded-md object-cover" /> : <div className="h-9 w-9 rounded-md bg-slate-100" />}<div><p className="font-medium text-slate-800">{p.name}</p><p className="font-mono text-xs text-slate-500">{p.oemNumber}</p></div></div> },
    { key: 'type', header: 'Type', render: (p) => <VehicleTypeBadge product={p} /> },
    { key: 'brand', header: 'Brand' },
    { key: 'category', header: 'Category', render: (p) => `${p.category}${p.subCategory ? ` / ${p.subCategory}` : ''}` },
    { key: 'fits', header: 'Fitment', render: (p) => <span className="text-xs">{fitmentText(p, 2)}</span> },
    { key: 'owner', header: 'Added by', render: (p) => (p.vendor ? <span className="text-xs font-medium text-brand-700">{p.vendor.shopName}</span> : <span className="text-xs text-slate-500">Master catalog</span>) },
    { key: 'gst', header: 'GST', render: (p) => `${Number(p.gstRate)}%` },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.isActive ? 'ACTIVE' : 'SUSPENDED'} /> },
    {
      key: 'actions', header: '', className: 'text-right',
      render: (p) => (
        <div className="flex justify-end gap-1">
          <button onClick={() => setEditing(p)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
          <button onClick={() => toggleActive(p)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600" title={p.isActive ? 'Hide' : 'Restore'} aria-label="Toggle active"><EyeOff className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Master catalog</h1>
          <p className="text-sm text-slate-500">Master products are shared with every shop. Products added by a shop are visible only to that shop.</p>
        </div>
        <Button icon={Plus} onClick={() => setEditing(null)}>New product</Button>
      </div>
      <div className="flex flex-wrap gap-3">
        <Input icon={Search} className="w-full sm:w-80" placeholder="Name, OEM, brand or vehicle" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="Search products" />
        <Select className="w-40" value={vehicleType} onChange={(e) => { setVehicleType(e.target.value); setPage(1); }} options={[{ value: 'CAR', label: 'Car parts' }, { value: 'BIKE', label: 'Bike parts' }]} placeholder="All vehicles" aria-label="Vehicle type" />
        <Select className="w-48" value={owner} onChange={(e) => { setOwner(e.target.value); setPage(1); }} options={[{ value: 'MASTER', label: 'Master catalog' }, { value: 'VENDOR', label: 'Added by shops' }]} placeholder="All products" aria-label="Added by" />
      </div>
      <Table columns={columns} rows={data ?? []} loading={loading} empty="No products found" />
      <Pagination meta={meta} onPageChange={setPage} />
      <ProductForm open={editing !== undefined} product={editing} onClose={() => setEditing(undefined)} onSaved={reload} />
    </div>
  );
}