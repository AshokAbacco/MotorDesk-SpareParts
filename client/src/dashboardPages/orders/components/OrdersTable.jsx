// client/src/dashboardPages/orders/components/OrdersTable.jsx
import { BadgeCheck, Store, Wrench } from 'lucide-react';
import Table from '../../../shared/ui/Table.jsx';
import { formatCurrency } from '../../../shared/utils/formatCurrency.js';
import { formatDateTime } from '../../../shared/utils/formatDate.js';
import StatusBadge from '../../components/StatusBadge.jsx';
import { paymentLabel } from '../../../shared/utils/constants.js';

const MATCHED_BY = { PHONE: 'phone', EMAIL: 'email' };
export const matchedByText = (m) => m.matchedBy.map((k) => MATCHED_BY[k]).join(' & ');

/** "MotorDesk Garage" tag for customers registered on the MotorDesk Garage CRM (matched by phone / email) */
export function CrmCustomerTag({ match, className = '' }) {
  return (
    <span title={`MotorDesk Garage CRM customer: ${match.name} (matched by ${matchedByText(match)})`}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-amberline-soft px-2 py-0.5 text-[11px] font-semibold text-amberline-ink ring-1 ring-amberline/40 ${className}`}>
      <Wrench className="h-3 w-3" /> MotorDesk Garage CRM Customer
      {match.isVerified && <BadgeCheck className="h-3 w-3 text-emerald-600" aria-label="Verified" />}
    </span>
  );
}

export default function OrdersTable({ rows, loading, onOpen }) {
  const columns = [
    {
      key: 'orderNumber', header: 'Order',
      render: (o) => (
        <div>
          <span className="font-medium text-slate-800">#{o.orderNumber}</span>
          {o.fulfilment === 'PICKUP' && (
            <span className="mt-0.5 flex w-fit items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700"><Store className="h-3 w-3" /> Store pickup</span>
          )}
          {o.source === 'MOTOR_KONNECT' && <span className="mt-0.5 block text-[11px] text-slate-400">via Motor Konnect app</span>}
        </div>
      ),
    },
    {
      key: 'customer', header: 'Customer',
      render: (o) => (
        <div className="max-w-[16rem]">
          <p>{o.shippingAddress.name}</p>
          {o.crmMatch ? (
            <>
              <CrmCustomerTag match={o.crmMatch} className="mt-0.5" />
              <p className="truncate text-xs text-slate-500" title={o.crmMatch.name}>{o.crmMatch.name} · {o.shippingAddress.city}</p>
            </>
          ) : (
            <p className="text-xs text-slate-500">{o.shippingAddress.city}{o.crmChecked && ' · Online customer'}</p>
          )}
        </div>
      ),
    },
    { key: 'items', header: 'Items', render: (o) => o.items.reduce((n, i) => n + i.quantity, 0) },
    { key: 'total', header: 'Total', className: 'text-right', render: (o) => formatCurrency(o.grandTotal) },
    { key: 'payment', header: 'Payment', render: (o) => <div className="flex items-center gap-1.5"><span className="text-xs">{paymentLabel(o)}</span>{o.paymentMode === 'UPI' && o.paymentStatus === 'PENDING' ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Verify</span> : <StatusBadge status={o.paymentStatus} />}</div> },
    { key: 'status', header: 'Status', render: (o) => <StatusBadge status={o.status} /> },
    { key: 'date', header: 'Placed', render: (o) => <span className="text-xs text-slate-500">{formatDateTime(o.createdAt)}</span> },
  ];
  return <Table columns={columns} rows={rows} loading={loading} onRowClick={onOpen} empty="No orders in this status" />;
}