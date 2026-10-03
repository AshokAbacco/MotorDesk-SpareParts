// client/src/landingPages/store/authStore.js
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getMe } from '../auth/login.api.js';
import { AUTH_STORAGE_KEY, setTokenRefreshHandler } from '../../shared/axiosInstance.js';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,

      setSession: ({ token, user }) => set({ token, user }),
      logout: () => set({ token: null, user: null }),

      refreshMe: async () => {
        if (!get().token) return;
        try {
          const res = await getMe();
          set({ user: res.data });
        } catch {
          /* 401 is handled by the axios interceptor */
        }
      },
    }),
    { name: AUTH_STORAGE_KEY, storage: createJSONStorage(() => localStorage) }
  )
);

// Sliding session: swap in the renewed token the server sends while the user is active
setTokenRefreshHandler((token) => {
  if (useAuthStore.getState().token) useAuthStore.setState({ token });
});

/** Where each role lands after login */
export const homeForRole = (role) => ({ ADMIN: '/admin', VENDOR: '/vendor/dashboard' })[role] ?? '/shop';