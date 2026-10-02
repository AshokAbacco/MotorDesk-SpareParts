import { ShoppingCart } from 'lucide-react';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../shared/ui/Button.jsx';
import EmptyState from '../../shared/ui/EmptyState.jsx';
import { formatCurrency } from '../../shared/utils/formatCurrency.js';
import { selectCartTotal, useShopCartStore } from '../store/shopCartStore.js';
import { validateCart } from './cart.api.js';
import CartItem from './CartDrawer/CartItem.jsx';

export default function CartPage() {
  const { items, syncWithServer } = useShopCartStore();
  const total = useShopCartStore(selectCartTotal);
  const navigate = useNavigate();

  // Refresh prices/stock once when the page opens
  useEffect(() => {
    const current = useShopCartStore.getState().items;
    if (!current.length) return;
    validateCart(current)
      .then((res) => {
        const gone = res.data.filter((c) => !c.available).length;
        syncWithServer(res.data);
        if (gone) toast(`${gone} item(s) are no longer available and were removed`, { icon: '⚠️' });
      })
      .catch(() => {});
  }, [syncWithServer]);

  if (!items.length) {
    return <EmptyState icon={ShoppingCart} title="Your cart is empty" description="Find parts for your vehicle and add them here." action={<Link to="/shop" className="text-brand-600">Browse parts</Link>} />;
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 md:grid-cols-[1fr_300px]">
      <section className="card divide-y divide-slate-100 px-4">
        <h1 className="py-4 text-lg font-semibold">Cart ({items.length})</h1>
        {items.map((i) => <CartItem key={i.inventoryId} item={i} />)}
      </section>
      <aside className="card h-fit space-y-3 p-4">
        <div className="flex justify-between text-sm"><span>Items</span><span>{items.reduce((n, i) => n + i.quantity, 0)}</span></div>
        <div className="flex justify-between font-semibold"><span>Total (incl. GST)</span><span>{formatCurrency(total)}</span></div>
        <p className="text-xs text-slate-500">Parts from different shops are shipped as separate orders.</p>
        <Button className="w-full" onClick={() => navigate('/checkout')}>Proceed to checkout</Button>
      </aside>
    </div>
  );
}
