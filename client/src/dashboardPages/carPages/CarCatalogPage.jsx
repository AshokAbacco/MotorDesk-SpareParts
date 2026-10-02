// client/src/dashboardPages/carPages/CarCatalogPage.jsx
import CatalogWorkspace from '../components/inventory/CatalogWorkspace.jsx';
import { addCarPart, getCarBrands, getCarCatalog, getCarModels } from './carInventory.api.js';

const api = { catalog: getCarCatalog, add: addCarPart, brands: getCarBrands, models: getCarModels };

export default function CarCatalogPage() {
  return <CatalogWorkspace title="Car parts catalog" api={api} vehicleType="CAR" />;
}