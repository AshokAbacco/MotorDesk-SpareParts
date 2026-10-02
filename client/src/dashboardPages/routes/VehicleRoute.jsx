// client/src/dashboardPages/routes/VehicleRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../../shared/hooks/useAuth.js';
import { allowedVehicles, canAccessVehicle } from '../../shared/utils/inventoryType.js';

const path = (vehicle) => vehicle.toLowerCase(); // CAR → car

/**
 * Guards the Car / Bike pages by the shop's inventory type.
 * A car-only shop opening /vendor/inventory/bike is sent to /vendor/inventory/car (same for catalog), and vice versa.
 */
export default function VehicleRoute({ vehicle, children }) {
  const { vendor } = useAuth();
  const { pathname } = useLocation();
  if (canAccessVehicle(vendor?.inventoryType, vehicle)) return children;

  const allowed = path(allowedVehicles(vendor?.inventoryType)[0]);
  return <Navigate to={pathname.replace(`/${path(vehicle)}`, `/${allowed}`)} replace />;
}

/** /vendor/inventory → the first inventory page this shop can open */
export function InventoryHome() {
  const { vendor } = useAuth();
  return <Navigate to={path(allowedVehicles(vendor?.inventoryType)[0])} replace />;
}