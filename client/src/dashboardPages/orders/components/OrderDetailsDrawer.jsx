// client/src/dashboardPages/orders/components/OrderDetailsDrawer.jsx
import { MapPin, Phone, X } from 'lucide-react';
import { formatCurrency } from '../../../shared/utils/formatCurrency.js';
import { formatDateTime } from '../../../shared/utils/formatDate.js';
import OrderTracker from '../../../landingPages/myOrders/components/OrderTracker.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import StatusUpdater from './StatusUpdater.jsx';

export default function OrderDetailsDrawer({ order, onClose, onUpdated }) {
  const open = Boolean(order);
  return (
    <div className={`fixed inset-0 z-40 ${open ? '' : 'pointer-events-none'}`}>
      <div onClick={onClose} className={`absolute inset-0 bg-slate-900/40 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} />
      <aside className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-xl transition-transform ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {order && (
          <>
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="font-semibold">#{order.orderNumber}</p>
                <p className="text-xs text-slate-500">{formatDateTime(order.createdAt)}</p>
              </div>
              <button onClick={onClose} className="rounded-md p-1 hover:bg-slate-100" aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto p-5 text-sm">
              <OrderTracker status={order.status} />
              <div>
                <p className="mb-1 font-semibold text-slate-700">Ship to</p>
                <p>{order.shippingAddress.name}</p>
                <p className="flex items-center gap-1 text-slate-500"><Phone className="h-3 w-3" /> {order.shippingAddress.phone}</p>
                <p className="flex items-start gap-1 text-slate-500"><MapPin className="mt-0.5 h-3 w-3" /> {order.shippingAddress.line1}{order.shippingAddress.landmark ? `, near ${order.shippingAddress.landmark}` : ''}, {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}</p>
              </div>
              <div>
                <p className="mb-1 font-semibold text-slate-700">Items</p>
                <ul className="divide-y divide-slate-100">
                  {order.items.map((i) => (
                    <li key={i.id} className="flex justify-between py-1.5">
                      <span>{i.productName} <span className="text-slate-400">× {i.quantity}</span><br /><span className="font-mono text-xs text-slate-400">{i.oemNumber}</span></span>
                      <span>{formatCurrency(i.lineTotal)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 space-y-1 border-t border-slate-200 pt-2">
                  <div className="flex justify-between text-slate-500"><span>GST</span><span>{formatCurrency(order.taxTotal)}</span></div>
                  <div className="flex justify-between font-semibold"><span>Total</span><span>{formatCurrency(order.grandTotal)}</span></div>
                  <div className="flex justify-between text-slate-500"><span>Payment</span><span>{order.paymentMode} · <StatusBadge status={order.paymentStatus} /></span></div>
                </div>
              </div>
              {order.invoice && <p className="rounded-lg bg-emerald-50 p-3 text-emerald-700">Invoice {order.invoice.invoiceNumber} generated.</p>}
            </div>
            <div className="border-t border-slate-200 p-4"><StatusUpdater order={order} onUpdated={onUpdated} /></div>
          </>
        )}
      </aside>
    </div>
  );
}