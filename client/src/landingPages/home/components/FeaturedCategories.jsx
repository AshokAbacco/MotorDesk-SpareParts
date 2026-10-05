// client/src/landingPages/home/components/FeaturedCategories.jsx
import { ArrowRight, Cog, Disc, Droplets, Filter, Gauge, Lightbulb, Settings2, Shield, SlidersHorizontal, Wrench } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCategories } from '../../shop/shop.api.js';

const ICONS = {
  Brakes: Disc, Filters: Filter, Engine: Cog, Suspension: Gauge, Lighting: Lightbulb, Lubricants: Droplets,
  Transmission: Settings2, 'Body & Exterior': Shield, Controls: SlidersHorizontal,
};

/** "Shop by category" — every category from the catalog, with a peek at what's inside */
export default function FeaturedCategories() {
  const [categories, setCategories] = useState([]);
  useEffect(() => { getCategories().then((r) => setCategories(r.data)).catch(() => {}); }, []);
  if (!categories.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-14">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold text-slate-900 sm:text-4xl">Shop by category</h2>
          <p className="mt-1 text-slate-500">From brake pads to bulbs — pick a system and narrow it down.</p>
        </div>
        <Link to="/shop" className="hidden shrink-0 items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800 sm:inline-flex">
          All parts <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {categories.map((c) => {
          const Icon = ICONS[c.name] ?? Wrench;
          const peek = c.subCategories.slice(0, 2).join(', ');
          return (
            <Link
              key={c.name}
              to={`/shop?category=${encodeURIComponent(c.name)}`}
              className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg hover:shadow-brand-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                <Icon className="h-5 w-5" />
              </span>
              <span className="mt-4 font-semibold text-slate-900">{c.name}</span>
              <span className="mt-0.5 line-clamp-1 text-xs text-slate-500" title={c.subCategories.join(', ')}>
                {peek || 'Browse parts'}{c.subCategories.length > 2 && ` +${c.subCategories.length - 2}`}
              </span>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-700 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                Browse <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}