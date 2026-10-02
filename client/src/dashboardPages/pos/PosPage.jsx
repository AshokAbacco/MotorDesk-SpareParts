// client/src/dashboardPages/pos/PosPage.jsx
import { RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import useDebounce from '../../shared/hooks/useDebounce.js';
import Button from '../../shared/ui/Button.jsx';
import Input from '../../shared/ui/Input.jsx';
import Select from '../../shared/ui/Select.jsx';
import { INDIAN_STATES } from '../../shared/utils/constants.js';
import { formatCurrency } from '../../shared/utils/formatCurrency.js';
import { usePosCartStore } from '../store/posCartStore.js';
import GstSummary from './components/GstSummary.jsx';
import InvoicePreview from './components/InvoicePreview.jsx';
import PaymentModeSelector from './components/PaymentModeSelector.jsx';
import PosCart from './components/PosCart.jsx';
import PosProductSearch from './components/PosProductSearch.jsx';
import { checkout, getPosGarages, getQuote } from './pos.api.js';

export default function PosPage() {
  const cart = usePosCartStore();
  const [garages, setGarages] = useState([]);
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [invoice, setInvoice] = useState(null);

  useEffect(() => { getPosGarages().then((r) => setGarages(r.data)).catch(() => {}); }, []);

  // Re-quote whenever the bill changes (debounced)
  const signature = useDebounce(JSON.stringify([cart.lines, cart.discount, cart.customer.garageId, cart.customer.customerState]), 300);
  useEffect(() => {
    const { lines, toPayload } = usePosCartStore.getState();
    if (!lines.length) { setQuote(null); return; }
    const { items, discount, garageId, customerState } = toPayload();
    setQuoting(true);
    getQuote({ items, discount, ...(garageId && { garageId }), ...(customerState && { customerState }) })
      .then((r) => setQuote(r.data))
      .catch((e) => toast.error(e.message))
      .finally(() => setQuoting(false));
  }, [signature]);


  const onCheckout = async () => {
    setSaving(true);
    try {
      const res = await checkout(cart.toPayload());
      setInvoice(res.data);
      cart.reset();
      toast.success(`Bill ${res.data.invoiceNumber} saved`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4 lg:h-[calc(100vh-7rem)] lg:grid-cols-[1fr_420px]">
      <PosProductSearch />

      <section className="card flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h1 className="font-semibold">Counter bill</h1>
          {cart.lines.length > 0 && <button onClick={cart.reset} className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-600"><RotateCcw className="h-3 w-3" /> Clear</button>}
        </div>

        <div className="flex-1 overflow-y-auto px-4"><PosCart /></div>

        <div className="space-y-3 border-t border-slate-200 bg-slate-50 p-4">
          <Select
            value={cart.customer.garageId}
            onChange={(e) => cart.setCustomer({ garageId: e.target.value })}
            options={garages.map((g) => ({ value: g.id, label: `${g.name} · ${g.phone}` }))}
            placeholder="Walk-in customer"
            aria-label="Customer"
          />
          {!cart.customer.garageId && (
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Customer name" value={cart.customer.customerName} onChange={(e) => cart.setCustomer({ customerName: e.target.value })} aria-label="Customer name" />
              <Input placeholder="Mobile" maxLength={10} value={cart.customer.customerPhone} onChange={(e) => cart.setCustomer({ customerPhone: e.target.value })} aria-label="Customer mobile" />
              <Select className="col-span-2" value={cart.customer.customerState} onChange={(e) => cart.setCustomer({ customerState: e.target.value })} options={INDIAN_STATES} placeholder="Same state (CGST + SGST)" aria-label="Customer state" />
            </div>
          )}

          <PaymentModeSelector />

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Discount ₹</span>
            <input type="number" min="0" value={cart.discount || ''} onChange={(e) => cart.setDiscount(e.target.value)} className="field w-28 py-1" aria-label="Discount" />
          </div>

          <GstSummary quote={quote} loading={quoting} />

          <Button className="w-full" size="lg" loading={saving} disabled={!cart.lines.length || quoting} onClick={onCheckout}>
            {quote ? `Save bill · ${formatCurrency(quote.grandTotal)}` : 'Save bill'}
          </Button>
        </div>
      </section>

      <InvoicePreview invoice={invoice} onClose={() => setInvoice(null)} />
    </div>
  );
}