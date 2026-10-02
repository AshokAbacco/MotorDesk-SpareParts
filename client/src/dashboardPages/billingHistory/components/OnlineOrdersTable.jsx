// client/src/dashboardPages/billingHistory/components/OnlineOrdersTable.jsx
import Table from '../../../shared/ui/Table.jsx';
import { formatCurrency } from '../../../shared/utils/formatCurrency.js';
import { formatDateTime } from '../../../shared/utils/formatDate.js';
import StatusBadge from '../../components/StatusBadge.jsx';

const MODE = { COD: 'Cash on delivery', UPI: 'UPI', ONLINE: 'Online' };

export default function OnlineOrdersTable({ rows, loading, onOpen }) {
  const columns = [
    { key: 'orderNumber', header: 'Order No', render: (o) => <span className="font-medium text-slate-800">#{o.orderNumber}</span> },
    { key: 'date', header: 'Date & Time', render: (o) => <span className="text-slate-600">{formatDateTime(o.createdAt)}</span> },
    {
      key: 'customer', header: 'Customer',
      render: (o) => (
        <div>
          <p className="text-slate-800">{o.shippingAddress?.name ?? o.customer?.name ?? '—'}</p>
          <p className="text-xs text-slate-500">{o.shippingAddress?.city}{o.shippingAddress?.phone ? ` · ${o.shippingAddress.phone}` : ''}</p>
        </div>
      ),
    },
    { key: 'items', header: 'Qty', className: 'text-right', render: (o) => o.items.reduce((n, i) => n + i.quantity, 0) },
    {
      key: 'payment', header: 'Payment',
      render: (o) => <div className="flex items-center gap-1.5"><span className="text-xs text-slate-600">{MODE[o.paymentMode] ?? o.paymentMode}</span><StatusBadge status={o.paymentStatus} /></div>,
    },
    { key: 'status', header: 'Order Status', render: (o) => <StatusBadge status={o.status} /> },
    {
      key: 'total', header: 'Total', className: 'text-right',
      render: (o) => <span className={`font-semibold ${o.status === 'CANCELLED' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{formatCurrency(o.grandTotal)}</span>,
    },
  ];
  return <Table columns={columns} rows={rows} loading={loading} onRowClick={onOpen} empty="No online orders in this period" />;
}