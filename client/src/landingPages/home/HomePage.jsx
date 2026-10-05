// client/src/landingPages/home/HomePage.jsx
import {
  ArrowRight, BadgeIndianRupee, Bike, Car, CheckCircle2, FileText, PackageSearch, ReceiptIndianRupee, Store, Truck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../shop/components/ProductCard.jsx';
import { getShopProducts } from '../shop/shop.api.js';
import FeaturedCategories from './components/FeaturedCategories.jsx';
import HeroSection from './components/HeroSection.jsx';

// Real promises the marketplace keeps (shown under the hero)
const TRUST = [
  { icon: Store, text: 'Verified local shops only' },
  { icon: FileText, text: 'GST invoice with every order' },
  { icon: BadgeIndianRupee, text: 'Pay by UPI or cash on delivery' },
];

// A real sequence, so the steps are numbered
const STEPS = [
  { icon: PackageSearch, title: 'Find your part', text: 'Search by part name or OEM number, or pick your vehicle’s brand, model and year.' },
  { icon: BadgeIndianRupee, title: 'Compare shops', text: 'See every shop that stocks it, with its price including GST and how many are in stock.' },
  { icon: Truck, title: 'Order and track', text: 'Pay by UPI or cash on delivery, and follow the order from accepted to delivered.' },
];

// What a shop gets from MotorDesk — all of these exist in the vendor dashboard
const FOR_SHOPS = [
  { icon: ReceiptIndianRupee, text: 'Counter billing with GST invoices' },
  { icon: PackageSearch, text: 'Car and bike inventory with low-stock alerts' },
  { icon: Truck, text: 'Online orders from customers nearby' },
  { icon: FileText, text: 'Billing history, P&L and GST reports' },
];

const fitsType = (p, type) => p.vehicleMappings?.some((m) => m.vehicle?.type === type);

/** Car / Bike entry panel with a collage of real part photos of that type */
function VehiclePanel({ type, products, total }) {
  const isCar = type === 'CAR';
  const Icon = isCar ? Car : Bike;
  const photos = products.filter((p) => p.images?.length && fitsType(p, type)).slice(0, 3);
  return (
    <Link
      to={`/shop?vehicleType=${type}`}
      className={`group relative flex min-h-[15rem] overflow-hidden rounded-3xl p-7 text-white transition duration-300 hover:-translate-y-1 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amberline ${isCar ? 'bg-brand-700 hover:shadow-brand-900/30' : 'bg-slate-900 hover:shadow-slate-900/40'}`}
    >
      <Icon aria-hidden strokeWidth={1} className="pointer-events-none absolute -bottom-10 -right-6 h-64 w-64 text-white/10 transition-transform duration-500 group-hover:-translate-x-3 group-hover:scale-105" />
      <div className="relative flex flex-1 flex-col">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15"><Icon className="h-6 w-6" /></span>
        <h3 className="mt-5 font-display text-4xl font-bold">{isCar ? 'Car parts' : 'Bike parts'}</h3>
        <p className="mt-1 max-w-xs text-white/80">
          {isCar ? 'Hatchbacks, sedans and SUVs — Maruti, Hyundai, Tata, Honda and more.' : 'Commuters and sport bikes — Hero, Honda, Bajaj, TVS, Royal Enfield and more.'}
          {total != null && <span className="block pt-1 text-sm text-white/60">{total} parts in stock</span>}
        </p>
        <span className="mt-auto inline-flex items-center gap-1 pt-6 font-medium">
          Shop {isCar ? 'car' : 'bike'} parts <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
      {photos.length > 0 && (
        <div className="relative hidden w-48 shrink-0 flex-col gap-3 sm:flex">
          {photos.map((p, i) => (
            <span key={p.id} className={`flex h-20 items-center justify-center rounded-xl bg-white p-2 shadow-lg transition-transform duration-500 ${i === 1 ? '-translate-x-6 group-hover:-translate-x-8' : 'group-hover:-translate-x-2'}`}>
              <img src={p.images[0]} alt="" className="h-full w-full object-contain" />
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [counts, setCounts] = useState({ all: null, CAR: null, BIKE: null });

  useEffect(() => {
    // Newest parts in stock (photos first) for the hero tray, the car/bike panels and "Fresh in stock"
    getShopProducts({ limit: 24, sort: 'newest' })
      .then((r) => {
        const withPhotos = r.data.filter((p) => p.images?.length);
        setProducts([...withPhotos, ...r.data.filter((p) => !p.images?.length)]);
        setCounts((c) => ({ ...c, all: r.meta?.total ?? null }));
      })
      .catch(() => {});
    ['CAR', 'BIKE'].forEach((type) =>
      getShopProducts({ limit: 1, vehicleType: type }).then((r) => setCounts((c) => ({ ...c, [type]: r.meta?.total ?? null }))).catch(() => {}));
  }, []);

  return (
    <>
      <HeroSection products={products} />

      {/* Trust strip */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-8 gap-y-3 px-4 py-4 text-sm text-slate-600">
          {counts.all != null && (
            <span className="flex items-center gap-2 font-medium text-slate-900">
              <span className="rounded-md bg-amberline-soft px-2 py-0.5 font-display text-lg font-bold text-amberline-ink">{counts.all}</span>
              parts in stock right now
            </span>
          )}
          {TRUST.map(({ icon: Icon, text }) => (
            <span key={text} className="flex items-center gap-2"><Icon className="h-4 w-4 text-brand-600" /> {text}</span>
          ))}
        </div>
      </section>

      <FeaturedCategories />

      {/* Fresh in stock — real products, same cards as the shop */}
      {products.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-14">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-bold text-slate-900 sm:text-4xl">Fresh in stock</h2>
              <p className="mt-1 text-slate-500">The latest parts shops have added to MotorDesk.</p>
            </div>
            <Link to="/shop?sort=newest" className="hidden shrink-0 items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800 sm:inline-flex">
              See all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.slice(0, 8).map((p) => <div key={p.id} className="flex"><ProductCard product={p} /></div>)}
          </div>
          <Link to="/shop?sort=newest" className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-brand-700 sm:hidden">
            See all parts <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      )}

      {/* How it works */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="font-display text-3xl font-bold text-slate-900 sm:text-4xl">How ordering works</h2>
          <ol className="mt-8 grid gap-8 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="relative">
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amberline font-display text-2xl font-bold text-slate-900">{i + 1}</span>
                  {i < STEPS.length - 1 && <span aria-hidden className="hidden h-px flex-1 bg-gradient-to-r from-slate-300 to-transparent md:block" />}
                </div>
                <h3 className="mt-5 flex items-center gap-2 text-lg font-semibold text-slate-900"><Icon className="h-5 w-5 text-brand-600" /> {title}</h3>
                <p className="mt-2 max-w-sm text-slate-600">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Car / Bike entry points */}
      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-14 md:grid-cols-2">
        <VehiclePanel type="CAR" products={products} total={counts.CAR} />
        <VehiclePanel type="BIKE" products={products} total={counts.BIKE} />
      </section>

      {/* For shop owners */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="relative overflow-hidden rounded-3xl bg-[#0B1F4B] px-6 py-10 text-white sm:px-10 lg:py-12">
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:repeating-linear-gradient(115deg,#fff_0_2px,transparent_2px_46px)]" />
          <div className="relative grid items-center gap-8 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-4xl font-bold leading-none sm:text-5xl">Own a spare parts shop?</h2>
              <p className="mt-4 max-w-md text-brand-100/90">Run your counter, stock and accounts on MotorDesk — and get orders from customers in your city.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-amberline px-5 py-3 font-semibold text-gray-200 transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40">
                  <Store className="h-5 w-5" /> Register your shop
                </Link>
                <Link to="/login" className="inline-flex items-center rounded-xl px-5 py-3 font-medium text-white ring-1 ring-white/30 transition hover:bg-white/10">
                  Shop owner login
                </Link>
              </div>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {FOR_SHOPS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 transition hover:bg-white/10">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-amberline" />
                  <span className="text-sm text-white/90">{text}</span>
                </li>
              ))}
              <li className="flex items-center gap-2 text-sm text-white/70 sm:col-span-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-amberline" /> Start on the free plan. Works for car parts, bike parts or both.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}