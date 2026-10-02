// client/src/landingPages/checkout/CheckoutPage.jsx
import { Banknote, LogOut, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import useAuth from '../../shared/hooks/useAuth.js';
import Button from '../../shared/ui/Button.jsx';
import EmptyState from '../../shared/ui/EmptyState.jsx';
import { UPI_APPS } from '../../shared/utils/upi.js';
import { homeForRole } from '../store/authStore.js';
import { useShopCartStore } from '../store/shopCartStore.js';
import { checkCart, getSavedAddresses, placeOrder } from './checkout.api.js';
import AddressSelector from './components/AddressSelector.jsx';
import Spinner from '../../shared/ui/Spinner.jsx';
import OrderSummary from './components/OrderSummary.jsx';


/** Shown when a vendor/admin opens checkout — the cart is kept, so switching accounts is painless */
function WrongAccount({ role, onSwitch }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="card p-6">
        <p className="text-lg font-semibold text-slate-800">You’re logged in as a {role.toLowerCase()}</p>
        <p className="mt-2 text-sm text-slate-500">
          Orders are placed from a <b>customer</b> account. Your cart is saved — switch accounts and you’ll come straight back here.
        </p>
        <div className="mt-6 space-y-2">
          <Button className="w-full" icon={LogOut} onClick={onSwitch}>Log out &amp; sign in as customer</Button>
          <Link to={homeForRole(role)} className="block text-sm text-brand-600 hover:underline">Back to my dashboard</Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const { isLoggedIn, isCustomer, user, role, logout } = useAuth();
  const { items, clear } = useShopCartStore();
  const [addresses, setAddresses] = useState(null); // null = loading
  const [selectedId, setSelectedId] = useState(null);
  const [paymentMode, setPaymentMode] = useState('COD');
  const [upiApp, setUpiApp] = useState('upi');
  const [shopsWithoutUpi, setShopsWithoutUpi] = useState(null); // null = still checking
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isCustomer) return;
    getSavedAddresses()
      .then((r) => { setAddresses(r.data); setSelectedId(r.data.find((a) => a.isDefault)?.id ?? r.data[0]?.id ?? null); })
      .catch(() => setAddresses([]));
  }, [isCustomer]);

  // UPI is offered only when every shop in the cart has saved its UPI ID
  const cartKey = items.map((i) => i.inventoryId).join(',');
  useEffect(() => {
    if (!isCustomer || !cartKey) return;
    checkCart(useShopCartStore.getState().items)
      .then((r) => {
        const missing = [...new Set(r.data.filter((c) => c.available && !c.upiEnabled).map((c) => c.vendorName))];
        setShopsWithoutUpi(missing);
        if (!missing.length) setPaymentMode('UPI');
      })
      .catch(() => setShopsWithoutUpi([]));
  }, [isCustomer, cartKey]);

  if (!isLoggedIn) return <Navigate to="/login?next=/checkout" replace />;
  if (!isCustomer) return <WrongAccount role={role} onSwitch={() => { logout(); navigate('/login?next=/checkout'); }} />;
  if (!items.length) return <EmptyState title="Your cart is empty" action={<Link to="/shop" className="text-brand-600">Browse parts</Link>} />;

  const upiAvailable = shopsWithoutUpi !== null && shopsWithoutUpi.length === 0;

  const selected = addresses?.find((a) => a.id === selectedId);

  const onPlace = async () => {
    if (!selected) { toast.error('Select or add a delivery address'); return; }
    setLoading(true);
    try {
      const { name, phone, line1, landmark, city, state, pincode } = selected;
      const res = await placeOrder({
        items: items.map(({ inventoryId, quantity }) => ({ inventoryId, quantity })),
        shippingAddress: { name, phone, line1, city, state, pincode, ...(landmark && { landmark }) },
        paymentMode,
      });
      const { orders } = res.data;
      clear();
      if (paymentMode === 'UPI') {
        navigate(`/pay?orders=${orders.map((o) => o.id).join(',')}&app=${upiApp}`, { replace: true });
      } else {
        toast.success(orders.length > 1 ? `${orders.length} orders placed (one per shop)` : 'Order placed!');
        navigate('/my-orders', { replace: true });
      }
    } catch (err) {
      // e.g. an old saved address missing a field → ask the customer to edit it
      toast.error(err.errors ? `Please check the delivery address: ${err.errors[0].message}` : err.message);
    } finally {
      setLoading(false);
    }
  };

  const shopCount = new Set(items.map((i) => i.vendorName)).size;

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 md:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Delivery address</h2>
            <Link to="/account" className="text-sm text-brand-600 hover:underline">Manage addresses</Link>
          </div>
          {addresses === null ? <Spinner /> : (
            <AddressSelector
              addresses={addresses}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onAddressesChange={setAddresses}
              defaults={{ name: user?.name ?? '', phone: user?.phone ?? '' }}
            />
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-3 font-semibold">Payment</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              disabled={!upiAvailable}
              onClick={() => setPaymentMode('UPI')}
              className={`flex items-start gap-3 rounded-lg border p-3 text-left disabled:cursor-not-allowed disabled:opacity-50 ${paymentMode === 'UPI' ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:bg-slate-50'}`}
            >
              <Smartphone className={`mt-0.5 h-5 w-5 ${paymentMode === 'UPI' ? 'text-brand-600' : 'text-slate-400'}`} />
              <span>
                <span className={`block text-sm font-medium ${paymentMode === 'UPI' ? 'text-brand-700' : 'text-slate-700'}`}>Pay by UPI</span>
                <span className="block text-xs text-slate-500">Google Pay · PhonePe · Paytm · any UPI app</span>
              </span>
            </button>
            <button
              onClick={() => setPaymentMode('COD')}
              className={`flex items-start gap-3 rounded-lg border p-3 text-left ${paymentMode === 'COD' ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:bg-slate-50'}`}
            >
              <Banknote className={`mt-0.5 h-5 w-5 ${paymentMode === 'COD' ? 'text-brand-600' : 'text-slate-400'}`} />
              <span>
                <span className={`block text-sm font-medium ${paymentMode === 'COD' ? 'text-brand-700' : 'text-slate-700'}`}>Cash on delivery</span>
                <span className="block text-xs text-slate-500">Pay when the part arrives</span>
              </span>
            </button>
          </div>

          {shopsWithoutUpi?.length > 0 && (
            <p className="mt-3 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">
              UPI isn’t available because {shopsWithoutUpi.join(', ')} {shopsWithoutUpi.length > 1 ? 'haven’t' : 'hasn’t'} set up UPI payments yet.
            </p>
          )}

          {paymentMode === 'UPI' && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-slate-700">Pay with</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {UPI_APPS.map(({ key, label, icon: Icon, color }) => (
                  <button key={key} onClick={() => setUpiApp(key)}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-xs font-medium ${upiApp === key ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    <Icon className={`h-6 w-6 ${color}`} /> {label}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                You pay each shop directly to its own UPI ID{shopCount > 1 ? ` — ${shopCount} shops means ${shopCount} small payments` : ''}. Parts are held for you for 30 minutes.
              </p>
            </div>
          )}
        </section>
      </div>

      <aside className="space-y-3">
        <OrderSummary items={items} />
        {selected && (
          <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            Delivering to <span className="font-medium text-slate-800">{selected.name}</span> ({selected.label}) · {selected.city} {selected.pincode}
          </p>
        )}
        <Button className="w-full" size="lg" loading={loading} disabled={!selected} onClick={onPlace}>
          {paymentMode === 'UPI' ? 'Continue to UPI payment' : 'Place order'}
        </Button>
        <p className="text-center text-xs text-slate-400">Ordering as {user?.email}</p>
      </aside>
    </div>
  );
}