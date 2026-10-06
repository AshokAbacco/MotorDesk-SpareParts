// client/src/dashboardPages/components/Sidebar.jsx
import {
  BarChart3, Bike, BookOpen, History, Car, ClipboardList, Cog, CreditCard, LayoutDashboard, Package, QrCode, ReceiptIndianRupee, Store, UserRound, Users, Wrench, X,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { APP_NAME } from '../../shared/utils/constants.js';
import { canAccessVehicle } from '../../shared/utils/inventoryType.js';
import { useUiStore } from '../store/uiStore.js';

export const VENDOR_NAV = [
  { to: '/vendor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { section: 'Sales' },
  { to: '/vendor/pos', label: 'POS billing', icon: ReceiptIndianRupee },
  { to: '/vendor/orders', label: 'Online orders', icon: ClipboardList },
  { to: '/vendor/billing-history', label: 'Billing history', icon: History },
  { to: '/vendor/garages', label: 'Motor Desk Garages', icon: Wrench },

  { section: 'Inventory' },
  { to: '/vendor/inventory/car', label: 'Car parts', icon: Car, vehicle: 'CAR' },
  { to: '/vendor/inventory/bike', label: 'Bike parts', icon: Bike, vehicle: 'BIKE' },
  { section: 'Master catalog' },
  { to: '/vendor/catalog/car', label: 'Car catalog', icon: BookOpen, vehicle: 'CAR' },
  { to: '/vendor/catalog/bike', label: 'Bike catalog', icon: BookOpen, vehicle: 'BIKE' },

  { section: 'Business' },
  { to: '/vendor/profile', label: 'Profile & P&L', icon: BarChart3 },
  { to: '/vendor/payment-settings', label: 'Payment settings', icon: QrCode },
];

/** Vendor menu for the shop's inventory type: CAR → car items only, BIKE → bike items only, BOTH → all */
export const vendorNav = (inventoryType) => VENDOR_NAV.filter((item) => !item.vehicle || canAccessVehicle(inventoryType, item.vehicle));

export const ADMIN_NAV = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/vendors', label: 'Vendors', icon: Store },
  { to: '/admin/customers', label: 'Customers', icon: UserRound },
  { to: '/admin/products', label: 'Products', icon: Package },
  // { to: '/admin/plans', label: 'Plans', icon: CreditCard },
  { to: '/shop', label: 'View marketplace', icon: Users },
  { to: '/admin/motordesk-garages', label: 'MotorDesk Garages', icon: Wrench },
];

export default function Sidebar({ nav }) {
  const { sidebarOpen, closeSidebar } = useUiStore();

  return (
    <>
      <div onClick={closeSidebar} className={`fixed inset-0 z-30 bg-slate-900/40 lg:hidden ${sidebarOpen ? '' : 'hidden'}`} />
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
          <span className="flex items-center gap-2 font-semibold text-brand-700"><Cog className="h-6 w-6" /> {APP_NAME}</span>
          <button onClick={closeSidebar} className="rounded-md p-1 hover:bg-slate-100 lg:hidden" aria-label="Close menu"><X className="h-5 w-5" /></button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {nav.map((item, i) =>
            item.section ? (
              <p key={item.section} className={`px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 ${i ? 'pt-4' : ''}`}>{item.section}</p>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={closeSidebar}
                className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
              >
                <item.icon className="h-4 w-4" /> {item.label}
              </NavLink>
            )
          )}
        </nav>
      </aside>
    </>
  );
}