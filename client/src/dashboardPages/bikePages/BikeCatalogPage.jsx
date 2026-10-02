// client/src/dashboardPages/bikePages/BikeCatalogPage.jsx
import CatalogWorkspace from '../components/inventory/CatalogWorkspace.jsx';
import { addBikePart, getBikeBrands, getBikeCatalog, getBikeModels } from './bikeInventory.api.js';

const api = { catalog: getBikeCatalog, add: addBikePart, brands: getBikeBrands, models: getBikeModels };

export default function BikeCatalogPage() {
  return <CatalogWorkspace title="Bike parts catalog" api={api} vehicleType="BIKE" />;
}