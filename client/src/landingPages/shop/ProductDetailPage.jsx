// client/src/landingPages/shop/ProductDetailPage.jsx
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, ImageOff, MapPin, Minus, Plus, ShieldCheck, Store } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import useFetch from '../../shared/hooks/useFetch.js';
import Button from '../../shared/ui/Button.jsx';
import EmptyState from '../../shared/ui/EmptyState.jsx';
import Spinner from '../../shared/ui/Spinner.jsx';
import { formatCurrency } from '../../shared/utils/formatCurrency.js';
import { useShopCartStore } from '../store/shopCartStore.js';
import ProductCard from './components/ProductCard.jsx';
import { getRelatedProducts, getShopProduct } from './shop.api.js';

// Cards per page by screen width: 5 on desktop, then 4 / 3 / 2 so cards never get squashed
const PER_PAGE = [[1024, 5], [768, 4], [560, 3], [0, 2]];
const perPageFor = (w) => PER_PAGE.find(([min]) => w >= min)[1];
const GRID_COLS = { 5: 'grid-cols-5', 4: 'grid-cols-4', 3: 'grid-cols-3', 2: 'grid-cols-2' };

function usePerPage() {
  const [perPage, setPerPage] = useState(() => perPageFor(typeof window === 'undefined' ? 1280 : window.innerWidth));
  useEffect(() => {
    const onResize = () => setPerPage(perPageFor(window.innerWidth));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return perPage;
}

/**
 * A row of product cards shown a page at a time (Flipkart / Amazon style):
 * exactly 5 full cards on desktop — no half-cut card, no scrollbar — and ‹ › move to the next / previous 5.
 */
function ProductRow({ title, subtitle, products }) {
  const perPage = usePerPage();
  const [page, setPage] = useState(0);
  const total = products?.length ?? 0;
  const pages = Math.max(1, Math.ceil(total / perPage));

  // New product opened or screen resized → back to a valid page
  useEffect(() => { setPage(0); }, [products]);
  useEffect(() => { setPage((pg) => Math.min(pg, pages - 1)); }, [pages]);

  if (!total) return null;
  const visible = products.slice(page * perPage, page * perPage + perPage);
  const arrow = 'rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white';

  return (
    <section className="mt-10">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
        {pages > 1 && (
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs text-slate-500" aria-live="polite">{page + 1} / {pages}</span>
            <button onClick={() => setPage(page - 1)} disabled={page === 0} className={arrow} aria-label={`Previous ${title}`}><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => setPage(page + 1)} disabled={page >= pages - 1} className={arrow} aria-label={`Next ${title}`}><ChevronRight className="h-4 w-4" /></button>
          </div>
        )}
      </div>
      {/* Fixed number of equal columns: every card has the same width & height; a short last page keeps the same card size */}
      <div className={`grid ${GRID_COLS[perPage]} items-stretch gap-3 sm:gap-4`}>
        {visible.map((rp) => (
          <div key={rp.id} className="flex min-w-0">
            <ProductCard product={rp} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const { data: p, loading, error } = useFetch(() => getShopProduct(id), [id]);
  const { data: rows } = useFetch(() => getRelatedProducts(id), [id]);
  const [image, setImage] = useState(0);
  const [qty, setQty] = useState(1);
  const addItem = useShopCartStore((s) => s.addItem);

  // Opening another part from the rows below → start at the top with a fresh picture & quantity
  useEffect(() => {
    window.scrollTo({ top: 0 });
    setImage(0);
    setQty(1);
  }, [id]);

  if (loading) return <div className="py-24"><Spinner /></div>;
  if (error) return <EmptyState title="Part not found" description={error} action={<Link to="/shop" className="text-brand-600">Back to shop</Link>} />;

  const vehicles = p.vehicleMappings.map((m) => m.vehicle);
  const grouped = Object.entries(
    vehicles.reduce((acc, v) => { (acc[`${v.brand} ${v.model}`] ??= []).push(v.year); return acc; }, {})
  ).map(([name, ys]) => `${name} (${Math.min(...ys)}–${Math.max(...ys)})`);

  const kind = vehicles.some((v) => v.type === 'BIKE') && !vehicles.some((v) => v.type === 'CAR') ? 'bike'
    : vehicles.some((v) => v.type === 'CAR') && !vehicles.some((v) => v.type === 'BIKE') ? 'car' : null;

  const add = (o) =>
    addItem({
      inventoryId: o.inventoryId, productId: p.id, name: p.name, oemNumber: p.oemNumber, image: p.images?.[0],
      priceWithGst: o.priceWithGst, mrp: o.mrp, maxQty: o.inStock, vendorName: o.vendor.shopName,
    }, qty);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Link to="/shop" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600"><ArrowLeft className="h-4 w-4" /> Back to parts</Link>

      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <div className="card flex aspect-square items-center justify-center overflow-hidden bg-slate-100">
            {p.images?.length ? <img src={p.images[image]} alt={p.name} className="h-full w-full object-contain" /> : <ImageOff className="h-12 w-12 text-slate-300" />}
          </div>
          {p.images?.length > 1 && (
            <div className="mt-3 flex gap-2">
              {p.images.map((src, i) => (
                <button key={src} onClick={() => setImage(i)} className={`h-16 w-16 overflow-hidden rounded-lg border-2 ${i === image ? 'border-brand-500' : 'border-transparent'}`}>
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-400">{p.brand} · {p.category}</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">{p.name}</h1>
          <p className="mt-1 font-mono text-sm text-slate-500">OEM: {p.oemNumber}{p.hsnCode && ` · HSN ${p.hsnCode}`}</p>
          {p.description && <p className="mt-4 text-slate-600">{p.description}</p>}

          {grouped.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-sm font-semibold text-slate-700">Compatible vehicles</p>
              <div className="flex flex-wrap gap-2">
                {grouped.map((g) => <span key={g} className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700"><CheckCircle2 className="h-3 w-3" />{g}</span>)}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center gap-3">
            <span className="text-sm text-slate-600">Quantity</span>
            <div className="flex items-center rounded-lg border border-slate-300">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-2 hover:bg-slate-50" aria-label="Decrease"><Minus className="h-4 w-4" /></button>
              <span className="w-10 text-center text-sm font-medium">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="p-2 hover:bg-slate-50" aria-label="Increase"><Plus className="h-4 w-4" /></button>
            </div>
          </div>

          <div className="mt-6">
            <p className="mb-2 text-sm font-semibold text-slate-700">Sold by {p.offers.length} shop{p.offers.length !== 1 && 's'}</p>
            {p.offers.length === 0 ? (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">Currently out of stock at all shops.</p>
            ) : (
              <div className="space-y-2">
                {p.offers.map((o, i) => (
                  <div key={o.inventoryId} className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${i === 0 ? 'border-brand-300 bg-brand-50/50' : 'border-slate-200'}`}>
                    <div>
                      <p className="flex items-center gap-1.5 font-medium text-slate-800"><Store className="h-4 w-4 text-slate-400" /> {o.vendor.shopName}</p>
                      <p className="flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" /> {o.vendor.city}, {o.vendor.state} · {o.inStock} in stock</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">{formatCurrency(o.priceWithGst)}</p>
                      {o.mrp > o.priceWithGst && <p className="text-xs text-slate-400 line-through">{formatCurrency(o.mrp)}</p>}
                    </div>
                    <Button size="sm" onClick={() => add(o)} disabled={qty > o.inStock}>Add</Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Prices include GST. Invoice provided by the selling shop.</p>
        </div>
      </div>

      {/* Below the product: closest matches first, then the rest of the shop */}
      <ProductRow
        title="Related parts"
        subtitle={`${rows?.category ?? p.category} parts first, then other ${kind ? `${kind} ` : ''}parts that fit the same vehicles`}
        products={rows?.related}
      />
      <ProductRow
        title={rows?.related?.length ? 'More parts you may like' : 'You may also like'}
        subtitle="Other parts available from shops on MotorDesk"
        products={rows?.more}
      />
    </div>
  );
}