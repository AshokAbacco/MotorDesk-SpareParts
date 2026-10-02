import InventoryWorkspace from '../components/inventory/InventoryWorkspace.jsx';
import * as carApi from './carInventory.api.js';
import CarFilters from './components/CarFilters.jsx';
import CarInventoryGrid from './components/CarInventoryGrid.jsx';
import CarInventoryTable from './components/CarInventoryTable.jsx';

// Stable object so child effects don't refire every render
const api = {
  list: carApi.getCarInventory,
  update: carApi.updateCarPart,
  adjust: carApi.adjustCarStock,
  remove: carApi.removeCarPart,
  brands: carApi.getCarBrands,
  categories: carApi.getCarCategories,
};

export default function CarInventoryPage() {
  return (
    <InventoryWorkspace
      title="Car parts inventory"
      subtitle="Stock, price and MRP of every car part you sell"
      catalogPath="/vendor/catalog/car"
      api={api}
      Filters={CarFilters}
      Table={CarInventoryTable}
      Grid={CarInventoryGrid}
    />
  );
}
