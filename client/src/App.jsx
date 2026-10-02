import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { Route, Routes } from 'react-router-dom';
import DashboardRoutes from './dashboardPages/routes/DashboardRoutes.jsx';
import LandingRoutes from './landingPages/routes/LandingRoutes.jsx';
import { useAuthStore } from './landingPages/store/authStore.js';

export default function App() {
  const refreshMe = useAuthStore((s) => s.refreshMe);

  // Re-sync the logged-in user (e.g. vendor just got approved) on app load
  useEffect(() => { refreshMe(); }, [refreshMe]);

  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { fontSize: 14 } }} />
      <Routes>
        <Route path="/vendor/*" element={<DashboardRoutes area="vendor" />} />
        <Route path="/admin/*" element={<DashboardRoutes area="admin" />} />
        <Route path="/*" element={<LandingRoutes />} />
      </Routes>
    </>
  );
}
