import { Bike, Car, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import Select from '../../../shared/ui/Select.jsx';
import { getCategories, getVehicleBrands, getVehicleModels, getVehicleYears } from '../shop.api.js';

/** Controlled by URL params: filters = { vehicleType, vehicleBrand, vehicleModel, year, category } */
export default function ProductFilters({ filters, onChange }) {
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [years, setYears] = useState([]);
  const { vehicleType, vehicleBrand, vehicleModel } = filters;

  useEffect(() => { getCategories().then((r) => setCategories(r.data)).catch(() => {}); }, []);
  useEffect(() => {
    setBrands([]);
    if (vehicleType) getVehicleBrands(vehicleType).then((r) => setBrands(r.data)).catch(() => {});
  }, [vehicleType]);
  useEffect(() => {
    setModels([]);
    if (vehicleType && vehicleBrand) getVehicleModels(vehicleType, vehicleBrand).then((r) => setModels(r.data)).catch(() => {});
  }, [vehicleType, vehicleBrand]);
  useEffect(() => {
    setYears([]);
    if (vehicleType && vehicleBrand && vehicleModel) getVehicleYears(vehicleType, vehicleBrand, vehicleModel).then((r) => setYears(r.data.map((y) => y.year))).catch(() => {});
  }, [vehicleType, vehicleBrand, vehicleModel]);

  const set = (patch) => onChange({ ...filters, ...patch });
  const hasAny = Object.values(filters).some(Boolean);

  return (
    <aside className="card space-y-4 p-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-slate-800">Filters</p>
        {hasAny && (
          <button onClick={() => onChange({})} className="flex items-center gap-1 text-xs text-brand-600 hover:underline"><X className="h-3 w-3" /> Clear</button>
        )}
      </div>

      <div>
        <p className="label">Vehicle type</p>
        <div className="grid grid-cols-2 gap-2">
          {[['CAR', Car, 'Car'], ['BIKE', Bike, 'Bike']].map(([val, Icon, label]) => (
            <button
              key={val}
              onClick={() => set({ vehicleType: vehicleType === val ? '' : val, vehicleBrand: '', vehicleModel: '', year: '' })}
              className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm ${vehicleType === val ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      {vehicleType && (
        <>
          <Select label="Brand" value={vehicleBrand ?? ''} options={brands} placeholder="All brands" onChange={(e) => set({ vehicleBrand: e.target.value, vehicleModel: '', year: '' })} />
          <Select label="Model" value={vehicleModel ?? ''} options={models} placeholder="All models" disabled={!vehicleBrand} onChange={(e) => set({ vehicleModel: e.target.value, year: '' })} />
          <Select label="Year" value={filters.year ?? ''} options={years.map(String)} placeholder="Any year" disabled={!vehicleModel} onChange={(e) => set({ year: e.target.value })} />
        </>
      )}

      <Select label="Category" value={filters.category ?? ''} options={categories.map((c) => c.name)} placeholder="All categories" onChange={(e) => set({ category: e.target.value })} />
    </aside>
  );
}
