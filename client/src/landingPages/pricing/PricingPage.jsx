// client/src/landingPages/pricing/PricingPage.jsx
import { Building2, CheckCircle2, CreditCard, ShieldCheck, ShoppingBag, Store, Trees, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Spinner from '../../shared/ui/Spinner.jsx';
import { formatCurrency } from '../../shared/utils/formatCurrency.js';
import SignupPaymentModal from './components/SignupPaymentModal.jsx';
import { getSignupPlans } from './pricing.api.js';

// Which plan fits which shop location
const AREAS = {
  URBAN: { label: 'City / town shop', icon: Building2, blurb: 'Your shop is in a city, town or its suburbs.' },
  RURAL: { label: 'Village / rural shop', icon: Trees, blurb: 'Your shop is in a village or rural area.' },
};

const STEPS = [
  { icon: CreditCard, title: 'Buy your plan', text: 'Pick the plan for your shop’s location and pay securely with Razorpay.' },
  { icon: UserPlus, title: 'Create your shop account', text: 'Your shop details are filled in for you — just add a password and what you sell.' },
  { icon: ShieldCheck, title: 'Start selling', text: 'After a quick admin check, add stock and take orders from customers nearby.' },
];

/** Pricing page for shop owners: Urban / Rural plans → Buy → payment form → Razorpay → register */
export default function PricingPage() {
  const [data, setData] = useState(null);
  const [area, setArea] = useState('URBAN');
  const [buying, setBuying] = useState(null);

  useEffect(() => { getSignupPlans().then((r) => setData(r.data)).catch(() => setData({ plans: [], paymentsEnabled: false })); }, []);

  return (
    <>
      <section className="relative overflow-hidden bg-[#0B1F4B] text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:repeating-linear-gradient(115deg,#fff_0_2px,transparent_2px_46px)]" />
        <div className="relative mx-auto max-w-5xl px-4 pb-28 pt-14 text-center">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-brand-100 ring-1 ring-white/15">
            <Store className="h-4 w-4 text-amberline" /> For spare parts shops
          </p>
          <h1 className="mx-auto mt-4 max-w-3xl font-display text-5xl font-bold leading-[0.95] sm:text-6xl">One simple plan to run your shop on MotorDesk</h1>
          <p className="mx-auto mt-4 max-w-xl text-brand-100/90">Counter billing with GST invoices, car & bike inventory, and online orders from customers near you.</p>

          {/* Where is the shop? → highlights the matching plan */}
          <div className="mt-8 inline-flex rounded-xl bg-white/10 p-1 ring-1 ring-white/15" role="radiogroup" aria-label="Where is your shop?">
            {Object.entries(AREAS).map(([key, a]) => (
              <button key={key} type="button" role="radio" aria-checked={area === key} onClick={() => setArea(key)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${area === key ? 'bg-amberline text-slate-900' : 'text-white/80 hover:text-white'}`}>
                <a.icon className="h-4 w-4" /> {a.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="relative mx-auto -mt-20 max-w-4xl px-4">
        {!data ? <div className="rounded-3xl bg-white py-16 shadow-xl"><Spinner /></div> : (
          <div className="grid gap-5 md:grid-cols-2">
            {data.plans.map((p) => {
              const a = AREAS[p.area];
              const picked = p.area === area;
              return (
                <article key={p.id}
                  className={`relative flex flex-col rounded-3xl bg-white p-7 shadow-xl transition duration-300 ${picked ? 'ring-4 ring-amberline md:-translate-y-2' : 'ring-1 ring-slate-200'}`}>
                  {picked && <span className="absolute -top-3 left-7 rounded-full bg-amberline px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-900">Your plan</span>}
                  <div className="flex items-center gap-3">
                    <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${picked ? 'bg-amberline-soft text-amberline-ink' : 'bg-slate-100 text-slate-600'}`}><a.icon className="h-5 w-5" /></span>
                    <div>
                      <h2 className="font-display text-2xl font-bold text-slate-900">{p.name}</h2>
                      <p className="text-xs text-slate-500">{a.blurb}</p>
                    </div>
                  </div>
                  <p className="mt-6 flex items-end gap-1">
                    <span className="font-display text-6xl font-bold leading-none text-slate-900">{formatCurrency(p.price).replace(/\.00$/, '')}</span>
                    <span className="pb-1 text-sm text-slate-500">/ {p.durationDays === 30 ? 'month' : `${p.durationDays} days`}</span>
                  </p>
                  <ul className="mt-6 flex-1 space-y-2.5 text-sm text-slate-700">
                    {p.features.map((f) => <li key={f} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {f}</li>)}
                  </ul>
                  <button type="button" onClick={() => setBuying(p)} disabled={!data.paymentsEnabled}
                    className={`mt-7 w-full rounded-xl py-3 font-semibold transition focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50 ${picked ? 'bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-200' : 'bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-300'}`}>
                    Buy {p.name}
                  </button>
                </article>
              );
            })}
            {data.plans.length === 0 && <p className="rounded-3xl bg-white p-10 text-center text-slate-500 shadow-xl md:col-span-2">Plans are being set up — please check back soon.</p>}
          </div>
        )}
        {data && !data.paymentsEnabled && data.plans.length > 0 && (
          <p className="mt-4 text-center text-sm text-amber-700">Online payment isn’t available right now. Please try again later.</p>
        )}
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-center font-display text-3xl font-bold text-slate-900">How it works</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="rounded-2xl border border-slate-200 bg-white p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amberline font-display text-xl font-bold text-slate-900">{i + 1}</span>
              <h3 className="mt-4 flex items-center gap-2 font-semibold text-slate-900"><Icon className="h-4 w-4 text-brand-600" /> {title}</h3>
              <p className="mt-1 text-sm text-slate-600">{text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-10 flex flex-wrap items-center justify-center gap-2 text-center text-sm text-slate-600">
          <ShoppingBag className="h-4 w-4 text-brand-600" /> Just buying parts? Customer accounts are free —
          <Link to="/register" className="font-medium text-brand-700 hover:underline">create one here</Link>.
        </p>
      </section>

      <SignupPaymentModal plan={buying} onClose={() => setBuying(null)} />
    </>
  );
}