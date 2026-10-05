// client/src/dashboardPages/components/Topbar.jsx
import { LogOut, Menu, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../shared/hooks/useAuth.js';
import NotificationBell from '../../shared/ui/NotificationBell.jsx';
import StatusBadge from './StatusBadge.jsx';
import { useUiStore } from '../store/uiStore.js';

export default function Topbar() {
  const { user, vendor, isVendor, logout } = useAuth();
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
      <button onClick={toggleSidebar} className="rounded-md p-1.5 hover:bg-slate-100 lg:hidden" aria-label="Open menu"><Menu className="h-5 w-5" /></button>
      {vendor && (
        <div className="flex min-w-0 items-center gap-2">
          <Store className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="truncate font-medium text-slate-800">{vendor.shopName}</span>
          {vendor.status !== 'APPROVED' && <StatusBadge status={vendor.status} />}
        </div>
      )}
      <div className="ml-auto flex items-center gap-3">
        {/* Order notifications (new orders, cancellations, payments) */}
        {isVendor && <NotificationBell key={user.id} />}
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-slate-800">{user?.name}</p>
          <p className="text-xs text-slate-500">{user?.role?.toLowerCase()}</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">{user?.name?.charAt(0)}</span>
        <button onClick={() => { logout(); navigate('/login'); }} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" title="Log out" aria-label="Log out">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}