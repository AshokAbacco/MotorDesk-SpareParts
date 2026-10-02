import { CheckCircle2, Cog } from 'lucide-react';
import { Link, Outlet } from 'react-router-dom';
import { APP_NAME } from '../../shared/utils/constants.js';

const POINTS = ['GST billing at the counter in seconds', 'Car & bike inventory with OEM search', 'Sell online to customers across India'];

export default function AuthLayout() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-gradient-to-br from-brand-700 to-brand-900 p-10 text-white lg:flex">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold"><Cog className="h-6 w-6" /> {APP_NAME}</Link>
        <div>
          <h2 className="text-3xl font-semibold leading-tight">The operating system for spare parts shops.</h2>
          <ul className="mt-6 space-y-3 text-brand-100">
            {POINTS.map((p) => <li key={p} className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-300" /> {p}</li>)}
          </ul>
        </div>
        <p className="text-sm text-brand-200">© {new Date().getFullYear()} {APP_NAME}</p>
      </aside>
      <main className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center gap-2 text-lg font-semibold text-brand-700 lg:hidden"><Cog className="h-6 w-6" /> {APP_NAME}</Link>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
