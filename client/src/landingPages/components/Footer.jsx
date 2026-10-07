// client/src/landingPages/components/Footer.jsx
import { Bike, Car, Cog, FileText, Store } from 'lucide-react';
import { FaFacebook, FaInstagram, FaWhatsapp } from 'react-icons/fa';
import { Link, useLocation } from 'react-router-dom';
import { APP_NAME } from '../../shared/utils/constants.js';

/*
 * Social links — put your real pages here (leave '' to show the icon without a link).
 * WhatsApp: https://wa.me/91XXXXXXXXXX (country code + number, no + or spaces)
 */
const SOCIAL = [
  { label: 'WhatsApp', icon: FaWhatsapp, href: '', hover: 'hover:bg-emerald-500' },
  { label: 'Instagram', icon: FaInstagram, href: '', hover: 'hover:bg-pink-500' },
  { label: 'Facebook', icon: FaFacebook, href: '', hover: 'hover:bg-blue-600' },
];

const COLUMNS = [
  {
    title: 'Shop parts',
    links: [
      { to: '/shop?vehicleType=CAR', label: 'Car parts' },
      { to: '/shop?vehicleType=BIKE', label: 'Bike parts' },
      { to: '/shop?sort=newest', label: 'Fresh in stock' },
      { to: '/shop', label: 'All parts' },
    ],
  },
  {
    title: 'Your account',
    links: [
      { to: '/my-orders', label: 'My orders' },
      { to: '/cart', label: 'Cart' },
      { to: '/account', label: 'Profile & addresses' },
      { to: '/login', label: 'Log in' },
    ],
  },
  {
    title: 'For shop owners',
    links: [
      { to: '/pricing', label: 'Plans & pricing' },
      { to: '/pricing', label: `Sell on ${APP_NAME}` },
      { to: '/login', label: 'Shop owner login' },
    ],
  },
];

const PROMISES = [
  { icon: Store, text: 'Verified local shops' },
  { icon: FileText, text: 'GST invoice with every order' },
  { icon: Car, text: 'Car parts' },
  { icon: Bike, text: 'Bike parts' },
];

const linkCls = 'rounded text-slate-300 transition hover:text-amberline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amberline';

export default function Footer() {
  // The home page already ends with a big shop-owner section, so the strip is shown on every other page
  const showShopStrip = useLocation().pathname !== '/';

  return (
    <footer className="relative overflow-hidden bg-[#0B1F4B] text-white">
      {/* Same road-marking texture as the home page hero */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:repeating-linear-gradient(115deg,#fff_0_2px,transparent_2px_46px)]" />

      <div className="relative mx-auto max-w-7xl px-4">
        {/* Shop-owner strip */}
        {showShopStrip && (
        <div className="flex flex-col items-start justify-between gap-4 border-b border-white/10 py-8 sm:flex-row sm:items-center">
          <div>
            <p className="font-display text-3xl font-bold leading-none">Run a spare parts shop?</p>
            <p className="mt-2 text-sm text-slate-300">Billing, stock and online orders in one place. Plans from ₹350 / month.</p>
          </div>
          <Link to="/pricing" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-amberline px-5 py-2.5 font-semibold text-slate-900 transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40">
            <Store className="h-4 w-4" /> Register your shop
          </Link>
        </div>
        )}

        <div className="grid gap-10 py-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-flex items-center gap-2 font-display text-2xl font-bold">
              <Cog className="h-6 w-6 text-amberline" /> {APP_NAME}
            </Link>
            <p className="mt-3 max-w-sm text-sm text-slate-300">
              Genuine car and bike spare parts from trusted local shops. Compare prices, order online, and get a GST invoice from the selling shop.
            </p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {PROMISES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs text-slate-200 ring-1 ring-white/10">
                  <Icon className="h-3.5 w-3.5 text-amberline" /> {text}
                </li>
              ))}
            </ul>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title} className="text-sm">
              <p className="mb-3 font-semibold text-white">{col.title}</p>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}><Link to={l.to} className={linkCls}>{l.label}</Link></li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col-reverse items-start justify-between gap-4 border-t border-white/10 py-6 sm:flex-row sm:items-center">
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
          <div className="flex gap-2">
            {SOCIAL.map(({ label, icon: Icon, href, hover }) => {
              const cls = `flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition ${hover} hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amberline`;
              return href
                ? <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={cls}><Icon className="h-4 w-4" /></a>
                : <span key={label} title={label} className={cls}><Icon className="h-4 w-4" /></span>;
            })}
          </div>
        </div>
      </div>
    </footer>
  );
}