export default function StatCard({ icon: Icon, label, value, sub, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600', green: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600', violet: 'bg-violet-50 text-violet-600', slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <div className="card flex items-start gap-3 p-4">
      {Icon && <span className={`rounded-lg p-2 ${tones[tone]}`}><Icon className="h-5 w-5" /></span>}
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-0.5 truncate text-xl font-semibold text-slate-900">{value}</p>
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}
