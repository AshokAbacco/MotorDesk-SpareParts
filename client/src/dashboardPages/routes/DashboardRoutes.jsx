// client/src/dashboardPages/routes/DashboardRoutes.jsx
import { Navigate, Route, Routes } from 'react-router-dom';
import AdminDashboardPage from '../admin/AdminDashboardPage.jsx';
import PlansPage from '../admin/PlansPage/PlansPage.jsx';
import ProductsPage from '../admin/ProductsPage.jsx';
import VendorsPage from '../admin/VendorsPage.jsx';
import BillingHistoryPage from '../billingHistory/BillingHistoryPage.jsx';
import BikeCatalogPage from '../bikePages/BikeCatalogPage.jsx';
import BikeInventoryPage from '../bikePages/BikeInventoryPage.jsx';
import CarCatalogPage from '../carPages/CarCatalogPage.jsx';
import CarInventoryPage from '../carPages/CarInventoryPage.jsx';
import CustomersPage from '../customers/CustomersPage.jsx';
import GaragesPage from '../garages/GaragesPage.jsx';
import DashboardPage from '../home/DashboardPage.jsx';
import AdminLayout from '../layouts/AdminLayout.jsx';
import VendorLayout from '../layouts/VendorLayout.jsx';
import OrdersPage from '../orders/OrdersPage.jsx';
import PaymentSettingsPage from '../paymentSettings/PaymentSettingsPage.jsx';
import PosPage from '../pos/PosPage.jsx';
import ProfilePage from '../profile/ProfilePage.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import RoleRoute from './RoleRoute.jsx';
import VehicleRoute, { InventoryHome } from './VehicleRoute.jsx';

/** Mounted at /vendor/* and /admin/* (see App.jsx) */
export default function DashboardRoutes({ area }) {
  if (area === 'admin') {
    return (
      <ProtectedRoute>
        <RoleRoute roles={['ADMIN']}>
          <Routes>
            <Route element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="vendors" element={<VendorsPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="plans" element={<PlansPage />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Route>
          </Routes>
        </RoleRoute>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <RoleRoute roles={['VENDOR']}>
        <Routes>
          <Route element={<VendorLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="inventory" element={<InventoryHome />} />
            {/* Car / Bike pages open only if the shop's inventory type allows them */}
            <Route path="inventory/car" element={<VehicleRoute vehicle="CAR"><CarInventoryPage /></VehicleRoute>} />
            <Route path="inventory/bike" element={<VehicleRoute vehicle="BIKE"><BikeInventoryPage /></VehicleRoute>} />
            <Route path="catalog/car" element={<VehicleRoute vehicle="CAR"><CarCatalogPage /></VehicleRoute>} />
            <Route path="catalog/bike" element={<VehicleRoute vehicle="BIKE"><BikeCatalogPage /></VehicleRoute>} />
            <Route path="pos" element={<PosPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="billing-history" element={<BillingHistoryPage />} />
            <Route path="garages" element={<GaragesPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="payment-settings" element={<PaymentSettingsPage />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Route>
        </Routes>
      </RoleRoute>
    </ProtectedRoute>
  );
}