const STYLES = {
  PENDING: 'bg-amber-50 text-amber-700 ring-amber-200',
  ACCEPTED: 'bg-blue-50 text-blue-700 ring-blue-200',
  PACKED: 'bg-violet-50 text-violet-700 ring-violet-200',
  SHIPPED: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  DELIVERED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  CANCELLED: 'bg-red-50 text-red-700 ring-red-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 ring-red-200',
  SUSPENDED: 'bg-slate-100 text-slate-600 ring-slate-200',
  ACTIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  EXPIRED: 'bg-slate-100 text-slate-600 ring-slate-200',
  IN_STOCK: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  LOW: 'bg-amber-50 text-amber-700 ring-amber-200',
  OUT: 'bg-red-50 text-red-700 ring-red-200',
  PAID: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  FAILED: 'bg-red-50 text-red-700 ring-red-200',
  REFUNDED: 'bg-slate-100 text-slate-600 ring-slate-200',
};
const LABELS = { IN_STOCK: 'In stock', LOW: 'Low stock', OUT: 'Out of stock' };

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[status] ?? 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
      {LABELS[status] ?? status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export const stockStatusOf = (item) => (item.stock === 0 ? 'OUT' : item.stock <= item.lowStockThreshold ? 'LOW' : 'IN_STOCK');