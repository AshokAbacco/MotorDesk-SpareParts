import { Pencil } from 'lucide-react';
import Table from '../../../shared/ui/Table.jsx';
import { formatCurrency } from '../../../shared/utils/formatCurrency.js';
import StatusBadge, { stockStatusOf } from '../StatusBadge.jsx';

export const fitmentText = (product, max = 2) => {
  const names = [...new Set(product.vehicleMappings.map((m) => `${m.vehicle.brand} ${m.vehicle.model}`))];
  return names.length ? names.slice(0, max).join(', ') + (names.length > max ? ` +${names.length - max}` : '') : '—';
};

export default function InventoryTableBase({ rows, loading, onEdit, fitmentLabel = 'Fits' }) {
  const columns = [
    {
      key: 'part', header: 'Part',
      render: (r) => (
        <div>
          <p className="font-medium text-slate-800">{r.product.name}</p>
          <p className="font-mono text-xs text-slate-500">{r.product.oemNumber} · {r.product.brand}</p>
        </div>
      ),
    },
    { key: 'fits', header: fitmentLabel, render: (r) => <span className="text-xs text-slate-600">{fitmentText(r.product)}</span> },
    { key: 'category', header: 'Category', className: 'hidden 2xl:table-cell', render: (r) => r.product.category },
    { key: 'price', header: 'Price (excl. GST)', className: 'text-right', render: (r) => formatCurrency(r.price) },
    { key: 'mrp', header: 'MRP', className: 'hidden text-right lg:table-cell', render: (r) => formatCurrency(r.mrp) },
    { key: 'stock', header: 'Stock', className: 'text-right', render: (r) => <span className="font-semibold">{r.stock}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={stockStatusOf(r)} /> },
    {
      key: 'actions', header: '', className: 'text-right',
      render: (r) => (
        <button onClick={() => onEdit(r)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600" aria-label="Edit">
          <Pencil className="h-4 w-4" />
        </button>
      ),
    },
  ];
  return <Table columns={columns} rows={rows} loading={loading} empty="No parts in inventory match these filters" />;
}
