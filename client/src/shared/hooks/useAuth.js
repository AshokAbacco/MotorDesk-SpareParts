import { useAuthStore } from '../../landingPages/store/authStore.js';

/** Convenience hook: const { user, isVendor, logout } = useAuth(); */
export default function useAuth() {
  const { user, token, logout, setSession } = useAuthStore();
  return {
    user,
    token,
    isLoggedIn: Boolean(token),
    role: user?.role,
    isAdmin: user?.role === 'ADMIN',
    isVendor: user?.role === 'VENDOR',
    isCustomer: user?.role === 'CUSTOMER',
    vendor: user?.vendor,
    logout,
    setSession,
  };
}
