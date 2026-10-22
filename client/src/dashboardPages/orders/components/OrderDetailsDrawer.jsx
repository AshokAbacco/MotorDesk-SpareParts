// client/src/dashboardPages/orders/components/OrderDetailsDrawer.jsx
import { Mail, MapPin, Phone, ReceiptText, Store, User, X } from 'lucide-react';
import { paymentLabel } from '../../../shared/utils/constants.js';
import { formatCurrency } from '../../../shared/utils/formatCurrency.js';
import { formatDateTime } from '../../../shared/utils/formatDate.js';
import OrderTracker from '../../../landingPages/myOrders/components/OrderTracker.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { CrmCustomerTag, matchedByText } from './OrdersTable.jsx';
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
              <OrderTracker status={order.status} fulfilment={order.fulfilment} />

              {/* Is the customer a garage on the MotorDesk Garage CRM? (matched by phone & email) */}
              {order.crmMatch ? (
                <div className="rounded-xl border border-amberline/50 bg-amberline-soft/60 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CrmCustomerTag match={order.crmMatch} />
                    <span className="text-[11px] text-amberline-ink">Matched by {matchedByText(order.crmMatch)}</span>
                  </div>
                  <p className="mt-2 font-semibold text-slate-900">{order.crmMatch.name}</p>
                  <div className="mt-1 space-y-0.5 text-xs text-slate-600">
                    {order.crmMatch.ownerName && <p className="flex items-center gap-1"><User className="h-3 w-3" /> {order.crmMatch.ownerName}</p>}
                    {order.crmMatch.phone && <p className="flex items-center gap-1"><Phone className="h-3 w-3" /> {order.crmMatch.phone}</p>}
                    {order.crmMatch.email && <p className="flex items-center gap-1"><Mail className="h-3 w-3" /> {order.crmMatch.email}</p>}
                    {order.crmMatch.gstin && <p className="flex items-center gap-1"><ReceiptText className="h-3 w-3" /> GSTIN <span className="font-mono">{order.crmMatch.gstin}</span></p>}
                    {order.crmMatch.address && <p className="flex items-start gap-1"><MapPin className="mt-0.5 h-3 w-3 shrink-0" /> {order.crmMatch.address}</p>}
                  </div>
                </div>
              ) : order.crmChecked && (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  Online customer — not registered on the MotorDesk Garage CRM{order.customer?.email ? ` (checked ${order.customer.email}${order.customer.phone ? ` / ${order.customer.phone}` : ''})` : ''}.
                </p>
              )}

              {order.fulfilment === 'PICKUP' ? (
                <div>
                  <p className="mb-1 flex items-center gap-1.5 font-semibold text-slate-700"><Store className="h-4 w-4 text-sky-600" /> Store pickup</p>
                  <p>{order.shippingAddress.name} will collect this order from your shop.</p>
                  <p className="flex items-center gap-1 text-slate-500"><Phone className="h-3 w-3" /> {order.shippingAddress.phone}</p>
                </div>
              ) : (
                <div>
                  <p className="mb-1 font-semibold text-slate-700">Ship to</p>
                  <p>{order.shippingAddress.name}</p>
                  <p className="flex items-center gap-1 text-slate-500"><Phone className="h-3 w-3" /> {order.shippingAddress.phone}</p>
                  <p className="flex items-start gap-1 text-slate-500"><MapPin className="mt-0.5 h-3 w-3" /> {order.shippingAddress.line1}{order.shippingAddress.landmark ? `, near ${order.shippingAddress.landmark}` : ''}, {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}</p>
                </div>
              )}
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
                  {Number(order.deliveryCharge) > 0 && <div className="flex justify-between text-slate-500"><span>Delivery charge</span><span>{formatCurrency(order.deliveryCharge)}</span></div>}
                  <div className="flex justify-between font-semibold"><span>Total</span><span>{formatCurrency(order.grandTotal)}</span></div>
                  <div className="flex justify-between text-slate-500"><span>Payment</span><span>{paymentLabel(order)} · <StatusBadge status={order.paymentStatus} /></span></div>
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