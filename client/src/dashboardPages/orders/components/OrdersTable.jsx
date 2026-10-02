import Table from '../../../shared/ui/Table.jsx';
import { formatCurrency } from '../../../shared/utils/formatCurrency.js';
import { formatDateTime } from '../../../shared/utils/formatDate.js';
import StatusBadge from '../../components/StatusBadge.jsx';
import { PAYMENT_LABELS } from '../../../shared/utils/constants.js';

export default function OrdersTable({ rows, loading, onOpen }) {
  const columns = [
    { key: 'orderNumber', header: 'Order', render: (o) => <span className="font-medium text-slate-800">#{o.orderNumber}</span> },
    { key: 'customer', header: 'Customer', render: (o) => <div><p>{o.shippingAddress.name}</p><p className="text-xs text-slate-500">{o.shippingAddress.city}</p></div> },
    { key: 'items', header: 'Items', render: (o) => o.items.reduce((n, i) => n + i.quantity, 0) },
    { key: 'total', header: 'Total', className: 'text-right', render: (o) => formatCurrency(o.grandTotal) },
    { key: 'payment', header: 'Payment', render: (o) => <div className="flex items-center gap-1.5"><span className="text-xs">{o.paymentMode === 'ONLINE' ? 'Online' : PAYMENT_LABELS[o.paymentMode]}</span>{o.paymentMode === 'UPI' && o.paymentStatus === 'PENDING' ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Verify</span> : <StatusBadge status={o.paymentStatus} />}</div> },
    { key: 'status', header: 'Status', render: (o) => <StatusBadge status={o.status} /> },
    { key: 'date', header: 'Placed', render: (o) => <span className="text-xs text-slate-500">{formatDateTime(o.createdAt)}</span> },
  ];
  return <Table columns={columns} rows={rows} loading={loading} onRowClick={onOpen} empty="No orders in this status" />;
}