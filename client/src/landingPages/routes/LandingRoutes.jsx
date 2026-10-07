// client/src/landingPages/routes/LandingRoutes.jsx
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import LoginPage from '../auth/LoginPage.jsx';
import RegisterPage from '../auth/RegisterPage.jsx';
import CartPage from '../cart/CartPage.jsx';
import CheckoutPage from '../checkout/CheckoutPage.jsx';
import HomePage from '../home/HomePage.jsx';
import AccountPage from '../account/AccountPage.jsx';
import AuthLayout from '../layouts/AuthLayout.jsx';
import ShopLayout from '../layouts/ShopLayout.jsx';
import MyOrdersPage from '../myOrders/MyOrdersPage.jsx';
import UpiPayPage from '../upiPay/UpiPayPage.jsx';
import PricingPage from '../pricing/PricingPage.jsx';
import ProductDetailPage from '../shop/ProductDetailPage.jsx';
import ProductListPage from '../shop/ProductListPage.jsx';
import useAuth from '../../shared/hooks/useAuth.js';
import { homeForRole } from '../store/authStore.js';
import NotFound from './NotFound.jsx';

/** Logged-in users skip the login/register screens (honouring ?next=, e.g. back to /checkout) */
function GuestOnly({ children }) {
  const { isLoggedIn, role } = useAuth();
  const { search } = useLocation();
  if (!isLoggedIn) return children;
  const next = new URLSearchParams(search).get('next');
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null; // no open redirects
  return <Navigate to={safeNext || homeForRole(role)} replace />;
}

export default function LandingRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="login" element={<GuestOnly><LoginPage /></GuestOnly>} />
        <Route path="register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
      </Route>
      <Route element={<ShopLayout />}>
        <Route index element={<HomePage />} />
        <Route path="shop" element={<ProductListPage />} />
        <Route path="shop/product/:id" element={<ProductDetailPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="my-orders" element={<MyOrdersPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="pay" element={<UpiPayPage />} />
        <Route path="pricing" element={<PricingPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}