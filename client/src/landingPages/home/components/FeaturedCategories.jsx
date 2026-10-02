import { Cog, Disc, Droplets, Filter, Gauge, Lightbulb, Settings2, Wrench } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCategories } from '../../shop/shop.api.js';

const ICONS = { Brakes: Disc, Filters: Filter, Engine: Cog, Suspension: Gauge, Lighting: Lightbulb, Lubricants: Droplets, Transmission: Settings2 };

export default function FeaturedCategories() {
  const [categories, setCategories] = useState([]);
  useEffect(() => { getCategories().then((r) => setCategories(r.data)).catch(() => {}); }, []);
  if (!categories.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <h2 className="mb-4 text-lg font-semibold text-slate-800">Shop by category</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {categories.map((c) => {
          const Icon = ICONS[c.name] ?? Wrench;
          return (
            <Link key={c.name} to={`/shop?category=${encodeURIComponent(c.name)}`} className="card flex items-center gap-3 p-4 transition hover:border-brand-300 hover:shadow-md">
              <span className="rounded-lg bg-brand-50 p-2 text-brand-600"><Icon className="h-5 w-5" /></span>
              <div>
                <p className="font-medium text-slate-800">{c.name}</p>
                <p className="text-xs text-slate-500">{c.subCategories.length} types</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
