import InventoryWorkspace from '../components/inventory/InventoryWorkspace.jsx';
import * as bikeApi from './bikeInventory.api.js';
import BikeFilters from './components/BikeFilters.jsx';
import BikeInventoryGrid from './components/BikeInventoryGrid.jsx';
import BikeInventoryTable from './components/BikeInventoryTable.jsx';

const api = {
  list: bikeApi.getBikeInventory,
  update: bikeApi.updateBikePart,
  adjust: bikeApi.adjustBikeStock,
  remove: bikeApi.removeBikePart,
  brands: bikeApi.getBikeBrands,
  categories: bikeApi.getBikeCategories,
};

export default function BikeInventoryPage() {
  return (
    <InventoryWorkspace
      title="Bike parts inventory"
      subtitle="Stock, price and MRP of every two-wheeler part you sell"
      catalogPath="/vendor/catalog/bike"
      api={api}
      Filters={BikeFilters}
      Table={BikeInventoryTable}
      Grid={BikeInventoryGrid}
    />
  );
}
