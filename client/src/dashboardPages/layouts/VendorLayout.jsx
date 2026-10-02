// client/src/dashboardPages/layouts/VendorLayout.jsx
import { Clock } from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../../shared/hooks/useAuth.js';
import EmptyState from '../../shared/ui/EmptyState.jsx';
import Sidebar, { vendorNav } from '../components/Sidebar.jsx';
import Topbar from '../components/Topbar.jsx';

export default function VendorLayout() {
  const { vendor } = useAuth();
  const { pathname } = useLocation();
  // Until approved, a shop can only complete its profile
  const blocked = vendor?.status !== 'APPROVED' && !pathname.startsWith('/vendor/profile');

  return (
    <div className="flex min-h-screen">
      <Sidebar nav={vendorNav(vendor?.inventoryType)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-4 sm:p-6">
          {blocked ? (
            <EmptyState
              icon={Clock}
              title={vendor?.status === 'PENDING' ? 'Your shop is awaiting approval' : `Your shop is ${vendor?.status?.toLowerCase()}`}
              description="The MotorDesk team verifies every shop before it can bill and sell. Complete your shop profile meanwhile."
              action={<Link to="/vendor/profile" className="text-brand-600">Complete profile</Link>}
            />
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}