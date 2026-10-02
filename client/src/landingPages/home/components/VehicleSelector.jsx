import { Bike, Car, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../shared/ui/Button.jsx';
import Select from '../../../shared/ui/Select.jsx';
import { getVehicleBrands, getVehicleModels, getVehicleYears } from '../../shop/shop.api.js';

export default function VehicleSelector() {
  const [type, setType] = useState('CAR');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [opts, setOpts] = useState({ brands: [], models: [], years: [] });
  const navigate = useNavigate();

  useEffect(() => {
    setBrand(''); setModel(''); setYear('');
    getVehicleBrands(type).then((r) => setOpts((o) => ({ ...o, brands: r.data, models: [], years: [] }))).catch(() => {});
  }, [type]);
  useEffect(() => {
    setModel(''); setYear('');
    if (brand) getVehicleModels(type, brand).then((r) => setOpts((o) => ({ ...o, models: r.data, years: [] }))).catch(() => {});
  }, [type, brand]);
  useEffect(() => {
    setYear('');
    if (model) getVehicleYears(type, brand, model).then((r) => setOpts((o) => ({ ...o, years: r.data.map((y) => String(y.year)) }))).catch(() => {});
  }, [type, brand, model]);

  const onFind = () => {
    const p = new URLSearchParams({ vehicleType: type, ...(brand && { vehicleBrand: brand }), ...(model && { vehicleModel: model }), ...(year && { year }) });
    navigate(`/shop?${p}`);
  };

  return (
    <section className="mx-auto -mt-8 max-w-7xl px-4">
      <div className="card p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Find parts for your vehicle</h2>
          <div className="flex rounded-lg bg-slate-100 p-1">
            {[['CAR', Car], ['BIKE', Bike]].map(([t, Icon]) => (
              <button key={t} onClick={() => setType(t)} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ${type === t ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'}`}>
                <Icon className="h-4 w-4" /> {t === 'CAR' ? 'Car' : 'Bike'}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <Select value={brand} onChange={(e) => setBrand(e.target.value)} options={opts.brands} placeholder="Brand" aria-label="Brand" />
          <Select value={model} onChange={(e) => setModel(e.target.value)} options={opts.models} placeholder="Model" disabled={!brand} aria-label="Model" />
          <Select value={year} onChange={(e) => setYear(e.target.value)} options={opts.years} placeholder="Year" disabled={!model} aria-label="Year" />
          <Button icon={Search} onClick={onFind}>Find parts</Button>
        </div>
      </div>
    </section>
  );
}
