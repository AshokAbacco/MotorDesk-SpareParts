// client/src/landingPages/shop/components/ProductCard.jsx
import { ImageOff, ShoppingCart, Store } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../../shared/utils/formatCurrency.js';
import { useShopCartStore } from '../../store/shopCartStore.js';

/**
 * Product card used on the shop page and in the "Related parts" / "More parts" rows.
 * Every card has the same size: fixed image box, fixed-height text lines (empty lines keep their space),
 * and the Add to cart button pinned to the bottom — so long names or missing details never change the layout.
 * The card fills its parent (h-full), so give the parent the width; rows/grids stretch it to equal height.
 */
export default function ProductCard({ product }) {
  const addItem = useShopCartStore((s) => s.addItem);
  const offer = product.bestOffer;
  const fits = product.vehicleMappings?.map((m) => m.vehicle) ?? [];
  const fitLabel = [...new Set(fits.map((v) => `${v.brand} ${v.model}`))].slice(0, 2).join(', ');
  const hasMrp = offer.mrp > offer.priceWithGst;

  const onAdd = () =>
    addItem({
      inventoryId: offer.inventoryId, productId: product.id, name: product.name, oemNumber: product.oemNumber,
      image: product.images?.[0], priceWithGst: offer.priceWithGst, mrp: offer.mrp, maxQty: offer.inStock, vendorName: offer.vendor.shopName,
    });

  return (
    <div className="card group flex h-full w-full flex-col overflow-hidden transition hover:shadow-md">
      {/* Fixed image box: any image size fits inside without changing the card */}
      <Link to={`/shop/product/${product.id}`} className="relative block h-40 w-full shrink-0 overflow-hidden border-b border-slate-100 bg-white">
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.name} className="h-full w-full object-contain p-3 transition group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100"><ImageOff className="h-8 w-8 text-slate-300" /></div>
        )}
        {offer.discountPct > 0 && (
          <span className="absolute left-2 top-2 rounded-md bg-emerald-600 px-1.5 py-0.5 text-xs font-semibold text-white">{offer.discountPct}% off</span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-3">
        {/* Each line has a fixed height and is cut with "…" so all cards line up */}
        <p className="h-4 truncate text-xs font-medium uppercase leading-4 tracking-wide text-slate-400">{product.brand}</p>
        <Link to={`/shop/product/${product.id}`} title={product.name}
          className="mt-1 line-clamp-2 h-10 text-sm font-medium leading-5 text-slate-800 hover:text-brand-700">
          {product.name}
        </Link>
        <p className="mt-1 h-4 truncate font-mono text-xs leading-4 text-slate-500">OEM {product.oemNumber}</p>
        <p className="mt-1 h-4 truncate text-xs leading-4 text-slate-500" title={fitLabel || undefined}>{fitLabel ? `Fits ${fitLabel}` : ' '}</p>

        <div className="mt-auto pt-3">
          <div className="flex h-7 items-baseline gap-2 overflow-hidden">
            <span className="truncate text-lg font-semibold leading-7 text-slate-900">{formatCurrency(offer.priceWithGst)}</span>
            {hasMrp && <span className="truncate text-xs text-slate-400 line-through">{formatCurrency(offer.mrp)}</span>}
          </div>
          <p className="flex h-4 items-center gap-1 overflow-hidden text-xs leading-4 text-slate-500">
            <Store className="h-3 w-3 shrink-0" />
            <span className="truncate">{offer.vendor.shopName}{product.offerCount > 1 && ` +${product.offerCount - 1} more`}</span>
          </p>
          <button onClick={onAdd} className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-medium text-white hover:bg-brand-700">
            <ShoppingCart className="h-4 w-4" /> Add to cart
          </button>
        </div>
      </div>
    </div>
  );
}