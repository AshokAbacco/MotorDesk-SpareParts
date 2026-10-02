import { ShoppingCart, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../shared/ui/Button.jsx';
import EmptyState from '../../../shared/ui/EmptyState.jsx';
import { formatCurrency } from '../../../shared/utils/formatCurrency.js';
import { selectCartTotal, useShopCartStore } from '../../store/shopCartStore.js';
import CartItem from './CartItem.jsx';

export default function CartDrawer() {
  const { items, isDrawerOpen, closeDrawer } = useShopCartStore();
  const total = useShopCartStore(selectCartTotal);
  const navigate = useNavigate();

  const go = (path) => { closeDrawer(); navigate(path); };

  return (
    <div className={`fixed inset-0 z-40 ${isDrawerOpen ? '' : 'pointer-events-none'}`} aria-hidden={!isDrawerOpen}>
      <div onClick={closeDrawer} className={`absolute inset-0 bg-slate-900/40 transition-opacity ${isDrawerOpen ? 'opacity-100' : 'opacity-0'}`} />
      <aside className={`absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-white shadow-xl transition-transform ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <p className="font-semibold">Your cart</p>
          <button onClick={closeDrawer} className="rounded-md p-1 hover:bg-slate-100" aria-label="Close cart"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 divide-y divide-slate-100 overflow-y-auto px-4">
          {items.length === 0 ? <EmptyState icon={ShoppingCart} title="Your cart is empty" /> : items.map((i) => <CartItem key={i.inventoryId} item={i} />)}
        </div>
        {items.length > 0 && (
          <div className="space-y-2 border-t border-slate-200 p-4">
            <div className="flex justify-between font-semibold"><span>Total (incl. GST)</span><span>{formatCurrency(total)}</span></div>
            <Button className="w-full" onClick={() => go('/checkout')}>Checkout</Button>
            <Button variant="secondary" className="w-full" onClick={() => go('/cart')}>View cart</Button>
          </div>
        )}
      </aside>
    </div>
  );
}
