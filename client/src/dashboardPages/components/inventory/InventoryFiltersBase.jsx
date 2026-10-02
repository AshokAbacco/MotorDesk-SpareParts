import { Search } from 'lucide-react';
import Input from '../../../shared/ui/Input.jsx';
import Select from '../../../shared/ui/Select.jsx';

const STOCK = [
  { value: 'IN_STOCK', label: 'In stock' },
  { value: 'LOW', label: 'Low stock' },
  { value: 'OUT', label: 'Out of stock' },
];

/** Search (OEM / part / vehicle) + vehicle brand + category + stock status */
export default function InventoryFiltersBase({ filters, onChange, brands = [], categories = [], brandLabel = 'Vehicle brand' }) {
  const set = (patch) => onChange({ ...filters, ...patch, page: 1 });
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Input icon={Search} placeholder="OEM no., part name or model…" value={filters.q} onChange={(e) => set({ q: e.target.value })} aria-label="Search inventory" />
      <Select value={filters.vehicleBrand} onChange={(e) => set({ vehicleBrand: e.target.value })} options={brands} placeholder={`All ${brandLabel.toLowerCase()}s`} aria-label={brandLabel} />
      <Select value={filters.category} onChange={(e) => set({ category: e.target.value })} options={categories} placeholder="All categories" aria-label="Category" />
      <Select value={filters.stockStatus} onChange={(e) => set({ stockStatus: e.target.value })} options={STOCK} placeholder="Any stock level" aria-label="Stock status" />
    </div>
  );
}
