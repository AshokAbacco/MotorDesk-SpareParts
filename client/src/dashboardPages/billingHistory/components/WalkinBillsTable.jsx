// client/src/dashboardPages/billingHistory/components/WalkinBillsTable.jsx
import Table from '../../../shared/ui/Table.jsx';
import { formatCurrency } from '../../../shared/utils/formatCurrency.js';
import { formatDateTime } from '../../../shared/utils/formatDate.js';
import { PAYMENT_LABELS } from '../../../shared/utils/constants.js';

const MODE_STYLE = {
  CASH: 'bg-emerald-50 text-emerald-700', UPI: 'bg-violet-50 text-violet-700',
  CARD: 'bg-blue-50 text-blue-700',
};

export default function WalkinBillsTable({ rows, loading, onOpen }) {
  const columns = [
    { key: 'invoiceNumber', header: 'Invoice No', render: (b) => <span className="font-medium text-slate-800">{b.invoiceNumber}</span> },
    { key: 'date', header: 'Date & Time', render: (b) => <span className="text-slate-600">{formatDateTime(b.createdAt)}</span> },
    {
      key: 'customer', header: 'Customer',
      render: (b) => (
        <div>
          <p className="text-slate-800">{b.garage?.name ?? b.customerName ?? 'Walk-in customer'}</p>
          <p className="text-xs text-slate-500">{b.garage ? 'Garage (B2B)' : 'Walk-in'}{(b.garage?.phone ?? b.customerPhone) ? ` · ${b.garage?.phone ?? b.customerPhone}` : ''}</p>
        </div>
      ),
    },
    { key: 'items', header: 'Qty', className: 'text-right', render: (b) => b.items.reduce((n, i) => n + i.quantity, 0) },
    { key: 'gst', header: 'GST', className: 'text-right', render: (b) => formatCurrency(Number(b.cgst) + Number(b.sgst) + Number(b.igst)) },
    { key: 'mode', header: 'Payment', render: (b) => <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${MODE_STYLE[b.paymentMode] ?? 'bg-slate-100 text-slate-600'}`}>{PAYMENT_LABELS[b.paymentMode] ?? b.paymentMode}</span> },
    { key: 'total', header: 'Total', className: 'text-right', render: (b) => <span className="font-semibold text-slate-900">{formatCurrency(b.grandTotal)}</span> },
  ];
  return <Table columns={columns} rows={rows} loading={loading} onRowClick={onOpen} empty="No counter bills in this period" />;
}