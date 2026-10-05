// client/src/landingPages/home/components/HeroSection.jsx
import { ImageOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../../shared/utils/formatCurrency.js';
import SearchBar from '../../shop/components/SearchBar.jsx';
import VehicleSelector from './VehicleSelector.jsx';

// Where each tile of the parts tray sits (staggered like parts laid out on a workbench)
const TRAY = [
  { cls: 'col-span-2 row-span-2', delay: '0s' },
  { cls: '', delay: '1.2s' },
  { cls: '', delay: '2.4s' },
  { cls: '', delay: '0.6s' },
  { cls: '', delay: '1.8s' },
  { cls: '', delay: '3s' },
];

/**
 * One part on the tray: real photo from the catalog + its lowest price.
 * The outer box floats; hovering (or keyboard focus) pauses it, so the tile is easy to click.
 */
function TrayTile({ product, cls, delay }) {
  return (
    <div
      style={{ animationDelay: delay }}
      className={`animate-float hover:[animation-play-state:paused] focus-within:[animation-play-state:paused] ${cls}`}
    >
      <Link
        to={`/shop/product/${product.id}`}
        className="group relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl bg-white p-3 shadow-lg shadow-slate-900/30 ring-1 ring-white/10 transition duration-300 hover:-translate-y-1 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amberline"
      >
        {product.images?.[0]
          ? <img src={product.images[0]} alt={product.name} className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-110" />
          : <ImageOff className="h-8 w-8 text-slate-300" />}
        <span className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2 rounded-lg bg-slate-900/85 px-2 py-1 text-[11px] text-white opacity-0 backdrop-blur transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
          <span className="truncate">{product.name}</span>
          <span className="shrink-0 font-semibold text-amberline">{formatCurrency(product.bestOffer.priceWithGst)}</span>
        </span>
      </Link>
    </div>
  );
}

/**
 * Landing hero: the one job of the page — find the right part — plus a tray of real parts from shops.
 * products: marketplace products (the ones with photos are used for the tray)
 */
export default function HeroSection({ products = [] }) {
  const tray = products.filter((p) => p.images?.length).slice(0, TRAY.length);

  return (
    <section className="relative overflow-hidden bg-[#0B1F4B] text-white">
      {/* Road-marking stripes + soft glow: quiet texture behind the content */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:repeating-linear-gradient(115deg,#fff_0_2px,transparent_2px_46px)]" />
      <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-brand-600/40 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-12 sm:pt-16 lg:grid-cols-12 lg:pb-20">
        <div className="lg:col-span-7">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-brand-100 ring-1 ring-white/15">
            <span className="h-2 w-2 rounded-full bg-amberline" /> Car and bike spare parts from local shops
          </p>
          <h1 className="mt-5 max-w-2xl font-display text-5xl font-bold leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
            The right part for your vehicle, from a shop near you.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-brand-100/90">
            Search by part name, OEM number or vehicle. Compare prices from trusted local dealers and get a GST invoice with every order.
          </p>

          <div className="mt-8 max-w-xl"><SearchBar size="lg" /></div>
          <div className="mt-4 max-w-2xl"><VehicleSelector embedded /></div>
        </div>

        {/* Parts tray (desktop): real catalog photos, gently floating; hover shows name & price */}
        {tray.length >= 4 && (
          <div className="hidden lg:col-span-5 lg:block">
            <div className="grid h-[26rem] grid-cols-3 grid-rows-3 gap-4">
              {tray.map((p, i) => <TrayTile key={p.id} product={p} {...TRAY[i]} />)}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}