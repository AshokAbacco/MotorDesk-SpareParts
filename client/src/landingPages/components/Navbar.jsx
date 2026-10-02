// client/src/landingPages/components/Navbar.jsx
import { Cog, LayoutDashboard, LogOut, Package, ShoppingCart, User, UserCircle } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import useAuth from '../../shared/hooks/useAuth.js';
import { APP_NAME } from '../../shared/utils/constants.js';
import { homeForRole } from '../store/authStore.js';
import { selectCartCount, useShopCartStore } from '../store/shopCartStore.js';
import SearchBar from '../shop/components/SearchBar.jsx';

export default function Navbar() {
  const { user, isLoggedIn, isCustomer, logout } = useAuth();
  const count = useShopCartStore(selectCartCount);
  const openDrawer = useShopCartStore((s) => s.openDrawer);
  const navigate = useNavigate();

  const onLogout = () => { logout(); navigate('/'); };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link to="/" className="flex shrink-0 items-center gap-2 font-semibold text-brand-700">
          <Cog className="h-6 w-6" /> <span className="hidden sm:inline">{APP_NAME}</span>
        </Link>

        <div className="hidden flex-1 md:block"><SearchBar /></div>

        <nav className="ml-auto flex items-center gap-1 text-sm">
          <NavLink to="/shop" className={({ isActive }) => `rounded-lg px-3 py-2 ${isActive ? 'text-brand-700' : 'text-slate-600 hover:bg-slate-100'}`}>Shop</NavLink>

          {isLoggedIn && !isCustomer && (
            <Link to={homeForRole(user.role)} className="flex items-center gap-1 rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100">
              <LayoutDashboard className="h-4 w-4" /> <span className="hidden sm:inline">Dashboard</span>
            </Link>
          )}
          {isCustomer && (
            <Link to="/my-orders" className="flex items-center gap-1 rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100">
              <Package className="h-4 w-4" /> <span className="hidden sm:inline">Orders</span>
            </Link>
          )}
          {isCustomer && (
            <NavLink to="/account" className={({ isActive }) => `flex items-center gap-1 rounded-lg px-3 py-2 ${isActive ? 'text-brand-700' : 'text-slate-600 hover:bg-slate-100'}`} title="My account">
              <UserCircle className="h-4 w-4" /> <span className="hidden sm:inline">Account</span>
            </NavLink>
          )}

          <button onClick={openDrawer} className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Open cart">
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">{count}</span>}
          </button>

          {isLoggedIn ? (
            <button onClick={onLogout} className="flex items-center gap-1 rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100" title={user?.email}>
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Logout</span>
            </button>
          ) : (
            <Link to="/login" className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-2 font-medium text-white hover:bg-brand-700">
              <User className="h-4 w-4" /> Login
            </Link>
          )}
        </nav>
      </div>
      <div className="px-4 pb-3 md:hidden"><SearchBar /></div>
    </header>
  );
}