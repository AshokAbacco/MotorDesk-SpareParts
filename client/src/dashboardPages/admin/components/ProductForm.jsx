// client/src/dashboardPages/admin/components/ProductForm.jsx
import { Bike, Car, Plus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import useAuth from '../../../shared/hooks/useAuth.js';
import Button from '../../../shared/ui/Button.jsx';
import Input from '../../../shared/ui/Input.jsx';
import Modal from '../../../shared/ui/Modal.jsx';
import Select from '../../../shared/ui/Select.jsx';
import { GST_RATES } from '../../../shared/utils/constants.js';
import { allowedVehicles } from '../../../shared/utils/inventoryType.js';
import { addVehicleRange, createProduct, getVehicleBrands, getVehicleModels, getVehicles, updateProduct } from '../products.api.js';
import ImageUploader from './ImageUploader.jsx';
import VehicleQuickAdd from './VehicleQuickAdd.jsx';

const EMPTY = { name: '', category: '', subCategory: '', brand: '', oemNumber: '', description: '', hsnCode: '', gstRate: 18, images: [] };

const VEHICLE_TABS = [['CAR', Car], ['BIKE', Bike]];
const ADD_NEW = '__add_new__'; // special dropdown value → opens the "Add new brand / model" panel
const THIS_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: THIS_YEAR + 1 - 1980 + 1 }, (_, i) => THIS_YEAR + 1 - i); // next year … 1980

/**
 * Create / edit a catalog product, including vehicle fitment.
 * One form for both logins:
 *  - Admin (Products page) → master catalog product, visible to every shop
 *  - Vendor (Car / Bike catalog page) → the shop's own product; fitment limited to the shop's inventory type
 * defaultType: 'CAR' | 'BIKE' — which fitment tab opens first for a NEW product (the catalog page passes its own type).
 * Editing opens on the product's own type. A product is either a Car part or a Bike part:
 * switching the tab to the other type (after confirming) removes the old type's vehicles.
 */
export default function ProductForm({ product, open, onClose, onSaved, defaultType = 'CAR' }) {
  const { isVendor, vendor } = useAuth();
  const vehicleTypes = isVendor ? allowedVehicles(vendor?.inventoryType) : ['CAR', 'BIKE'];
  // Editing → open on the type the product already fits; new product → the page's type
  const productType = product?.vehicleMappings?.[0]?.vehicle?.type;
  const wanted = productType ?? defaultType;
  const startType = vehicleTypes.includes(wanted) ? wanted : vehicleTypes[0];
  const [form, setForm] = useState(EMPTY);
  const [vehicles, setVehicles] = useState([]); // selected vehicle objects
  const [pick, setPick] = useState({ type: startType, brand: '', model: '' });
  const [opts, setOpts] = useState({ brands: [], models: [], years: [] });
  const [adding, setAdding] = useState(null); // null | 'brand' | 'model' — the inline add-vehicle panel
  const [saving, setSaving] = useState(false);
  const [range, setRange] = useState({ from: '', to: '' }); // From / To year pickers for the chosen model
  const [applyingRange, setApplyingRange] = useState(false);
  const autoAddYears = useRef(false); // true right after the user picks a model → all its years get ticked

  useEffect(() => {
    if (!open) return;
    if (product) {
      setForm({ ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, product[k] ?? EMPTY[k]])), gstRate: Number(product.gstRate) });
      setVehicles(product.vehicleMappings.map((m) => m.vehicle));
    } else {
      setForm(EMPTY);
      setVehicles([]);
    }
    // Editing → show the product's first fitted vehicle in the Brand / Model dropdowns (years load below them)
    const first = product?.vehicleMappings?.find((m) => m.vehicle.type === startType)?.vehicle;
    setPick({ type: startType, brand: first?.brand ?? '', model: first?.model ?? '' });
    setAdding(null);
  }, [product, open, startType]);

  const loadBrands = (type) => getVehicleBrands(type).then((r) => setOpts((o) => ({ ...o, brands: r.data }))).catch(() => {});
  const loadModels = (type, brand) => getVehicleModels(type, brand).then((r) => setOpts((o) => ({ ...o, models: r.data }))).catch(() => {});
  useEffect(() => { loadBrands(pick.type); }, [pick.type]);
  useEffect(() => { if (pick.brand) loadModels(pick.type, pick.brand); }, [pick.type, pick.brand]);
  useEffect(() => {
    if (pick.model) {
      getVehicles(pick).then((r) => {
        setOpts((o) => ({ ...o, years: r.data }));
        // Picking a brand + model means "this part fits it" → tick all years (untick the ones it doesn't fit)
        if (autoAddYears.current) {
          autoAddYears.current = false;
          setVehicles((cur) => (cur.some((v) => r.data.some((y) => y.id === v.id)) ? cur : [...cur, ...r.data]));
        }
      }).catch(() => {});
    } else setOpts((o) => ({ ...o, years: [] }));
  }, [pick]);

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const selectedIds = new Set(vehicles.map((v) => v.id));

  // From / To show the ticked years of the chosen model (or all its known years)
  const modelKey = `${pick.type}|${pick.brand}|${pick.model}`;
  const tickedYears = vehicles.filter((v) => v.type === pick.type && v.brand === pick.brand && v.model === pick.model).map((v) => v.year);
  useEffect(() => {
    const ys = tickedYears.length ? tickedYears : opts.years.map((v) => v.year);
    setRange(ys.length ? { from: Math.min(...ys), to: Math.max(...ys) } : { from: '', to: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelKey, opts.years, tickedYears.join(',')]);

  const rangeError = (from, to) => {
    if (!from || !to) return 'Choose a From and To year';
    if (to < from) return '"To" year must be the same as or after "From" year';
    if (to - from >= 40) return 'Year range can be at most 40 years';
    return null;
  };
  const rangeProblem = range.from && range.to ? rangeError(Number(range.from), Number(range.to)) : null;

  /**
   * Fit exactly From…To for this model (replaces the years ticked before). Years the model doesn't have yet
   * are added to the vehicle list first. Returns the new fitment list, or null if it couldn't be applied.
   */
  const applyRange = async (fromValue, toValue) => {
    const from = Number(fromValue), to = Number(toValue);
    const problem = rangeError(from, to);
    if (problem) { toast.error(problem); return null; }
    const known = opts.years.filter((v) => v.year >= from && v.year <= to);
    let inRange = known;
    if (known.length < to - from + 1) {
      setApplyingRange(true);
      try {
        const res = await addVehicleRange({ type: pick.type, brand: pick.brand, model: pick.model, yearFrom: from, yearTo: to });
        inRange = res.data.vehicles;
        const all = await getVehicles(pick);
        setOpts((o) => ({ ...o, years: all.data }));
        if (res.data.created) toast.success(`${res.data.created} new year${res.data.created > 1 ? 's' : ''} added for ${pick.brand} ${pick.model}`);
      } catch (err) {
        toast.error(err.message);
        return null;
      } finally { setApplyingRange(false); }
    }
    const sameModel = (v) => v.type === pick.type && v.brand === pick.brand && v.model === pick.model;
    const next = [...vehicles.filter((v) => !sameModel(v)), ...inRange];
    setVehicles(next);
    return next;
  };

  // Changing From or To applies the range straight away (no extra button to forget)
  const onRangeChange = (key) => (e) => {
    const next = { ...range, [key]: e.target.value };
    setRange(next);
    if (next.from && next.to && !rangeError(Number(next.from), Number(next.to))) applyRange(next.from, next.to);
  };
  const toggle = (v) => setVehicles(selectedIds.has(v.id) ? vehicles.filter((x) => x.id !== v.id) : [...vehicles, v]);
  const addAllYears = () => setVehicles([...vehicles, ...opts.years.filter((v) => !selectedIds.has(v.id))]);

  /** Car ⇄ Bike: a part is for one vehicle type, so the other type's vehicles are removed (after confirming) */
  const switchType = (type) => {
    if (type === pick.type) return;
    const other = vehicles.filter((v) => v.type !== type);
    if (other.length) {
      const label = type === 'BIKE' ? 'Bike' : 'Car';
      const names = [...new Set(other.map((v) => `${v.brand} ${v.model}`))].join(', ');
      if (!window.confirm(`Change this part to a ${label} part?\n\nThese ${type === 'BIKE' ? 'car' : 'bike'} vehicles will be removed from the fitment:\n${names}`)) return;
      setVehicles(vehicles.filter((v) => v.type === type));
    }
    setAdding(null);
    setPick({ type, brand: '', model: '' });
  };

  const onBrandChange = (e) => {
    if (e.target.value === ADD_NEW) return setAdding('brand');
    setAdding(null);
    setPick({ ...pick, brand: e.target.value, model: '' });
  };
  const onModelChange = (e) => {
    if (e.target.value === ADD_NEW) return setAdding('model');
    setAdding(null);
    autoAddYears.current = Boolean(e.target.value);
    setPick({ ...pick, model: e.target.value });
  };

  // New brand/model saved → refresh the lists, select it, and tick all the years that were added
  const onVehicleAdded = ({ brand, model, vehicles: added }) => {
    setAdding(null);
    loadBrands(pick.type);
    loadModels(pick.type, brand);
    setPick({ type: pick.type, brand, model });
    setVehicles((cur) => [...cur, ...added.filter((v) => !cur.some((x) => x.id === v.id))]);
  };

  const brandOptions = [...opts.brands, { value: ADD_NEW, label: '+ Add new brand' }];
  const modelOptions = pick.brand ? [...opts.models, { value: ADD_NEW, label: '+ Add new model' }] : [];

  // Group selected fitment for compact chips: "Hyundai Creta 2020–2024"
  const groups = Object.values(vehicles.reduce((acc, v) => {
    const k = `${v.type}|${v.brand}|${v.model}`;
    (acc[k] ??= { key: k, type: v.type, brand: v.brand, model: v.model, label: `${v.brand} ${v.model}`, items: [] }).items.push(v);
    return acc;
  }, {}));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (applyingRange) return toast('Adding the years… press Save again in a moment', { icon: '⏳' });
    // Brand + model chosen but no year ticked → it still counts: use the From / To years (or all its years)
    let fitted = vehicles;
    const picked = opts.years.filter((y) => y.brand === pick.brand && y.model === pick.model);
    if (pick.model && !vehicles.some((v) => v.type === pick.type && v.brand === pick.brand && v.model === pick.model)) {
      if (range.from && range.to) {
        const applied = await applyRange(range.from, range.to);
        if (!applied) return;
        fitted = applied;
      } else if (picked.length) {
        fitted = [...vehicles, ...picked];
        setVehicles(fitted);
      }
    }
    // A shop's product must fit at least one vehicle, otherwise it can't show in its Car / Bike catalog
    if (isVendor && !fitted.length) return toast.error('Select at least one vehicle this part fits');
    if (!fitted.length && !window.confirm('No vehicle fitment selected.\n\nThis part will have no Car / Bike type and won’t appear in vehicle searches. Save anyway?')) return;
    setSaving(true);
    const body = { ...Object.fromEntries(Object.entries(form).filter(([, v]) => v !== '')), gstRate: Number(form.gstRate), vehicleIds: fitted.map((v) => v.id) };
    try {
      const res = product ? await updateProduct(product.id, body) : await createProduct(body);
      toast.success(product ? 'Product updated' : 'Product created');
      onSaved?.(res.data, { created: !product });
      onClose();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={product ? 'Edit product' : isVendor ? 'New product' : 'New catalog product'} size="xl"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="product-form" loading={saving}>Save product</Button></>}>
      <form id="product-form" onSubmit={onSubmit} className="space-y-5">
        {isVendor && (
          <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-800">
            This product is added to <b>your shop only</b> — other shops can’t see or change it. After saving, set your price and stock to start selling.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input className="lg:col-span-2" label="Product name" name="name" value={form.name} onChange={set} required />
          <Input label="OEM / part number" name="oemNumber" value={form.oemNumber} onChange={set} required />
          <Input label="Category" name="category" value={form.category} onChange={set} placeholder="Brakes" required />
          <Input label="Sub-category" name="subCategory" value={form.subCategory} onChange={set} placeholder="Brake Pads" />
          <Input label="Brand" name="brand" value={form.brand} onChange={set} placeholder="Bosch" required />
          <Input label="HSN code" name="hsnCode" value={form.hsnCode} onChange={set} />
          <Select label="GST rate" name="gstRate" value={form.gstRate} onChange={set} options={GST_RATES.map((r) => ({ value: r, label: `${r}%` }))} />
        </div>
        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea id="description" name="description" rows={2} className="field" value={form.description} onChange={set} />
        </div>
        <ImageUploader value={form.images} onChange={(images) => setForm({ ...form, images })} />

        <div className="rounded-lg border border-slate-200 p-4">
          <p className="label">Vehicle fitment{isVendor && <span className="text-red-500"> *</span>}</p>
          <div className="grid gap-2 sm:grid-cols-[auto_1fr_1fr]">
            <div className="flex rounded-lg bg-slate-100 p-1">
              {VEHICLE_TABS.filter(([t]) => vehicleTypes.includes(t)).map(([t, Icon]) => (
                <button type="button" key={t} onClick={() => switchType(t)} className={`flex items-center gap-1 rounded-md px-3 py-1 text-sm ${pick.type === t ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'}`}>
                  <Icon className="h-4 w-4" /> {t === 'CAR' ? 'Car' : 'Bike'}
                </button>
              ))}
            </div>
            <Select value={adding === 'brand' ? ADD_NEW : pick.brand} onChange={onBrandChange} options={brandOptions} placeholder="Brand" aria-label="Vehicle brand" />
            <Select value={adding === 'model' ? ADD_NEW : pick.model} onChange={onModelChange} options={modelOptions} placeholder={pick.brand ? 'Model' : 'Select a brand first'} disabled={!pick.brand} aria-label="Vehicle model" />
          </div>
          {adding && (
            <VehicleQuickAdd
              key={`${adding}-${pick.type}-${pick.brand}`}
              mode={adding}
              type={pick.type}
              brand={pick.brand}
              brands={opts.brands}
              models={opts.models}
              onAdded={onVehicleAdded}
              onCancel={() => setAdding(null)}
            />
          )}
          {!adding && (
            <p className="mt-2 text-xs text-slate-500">
              Brand or model not in the list? Choose <b>+ Add new brand</b> or <b>+ Add new model</b> from the dropdown.
            </p>
          )}
          {opts.years.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {opts.years.map((v) => (
                <button type="button" key={v.id} onClick={() => toggle(v)} className={`rounded-md border px-2 py-1 text-xs ${selectedIds.has(v.id) ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600'}`}>{v.year}</button>
              ))}
              <button type="button" onClick={addAllYears} className="flex items-center gap-1 px-2 text-xs font-medium text-brand-600"><Plus className="h-3 w-3" /> All years</button>
            </div>
          )}
          {pick.model && !adding && (
            // Year range: pick From / To — years missing for this model are added automatically
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="flex flex-col text-xs text-slate-600">
                From year
                <select className="field mt-1 w-28 py-1.5 text-sm" value={range.from} onChange={onRangeChange('from')} disabled={applyingRange} aria-label="Fitment from year">
                  <option value="">—</option>
                  {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </label>
              <label className="flex flex-col text-xs text-slate-600">
                To year
                <select className="field mt-1 w-28 py-1.5 text-sm" value={range.to} onChange={onRangeChange('to')} disabled={applyingRange} aria-label="Fitment to year">
                  <option value="">—</option>
                  {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </label>
              <p className={`w-full text-xs sm:w-auto sm:pb-2 ${rangeProblem ? 'text-red-600' : 'text-slate-400'}`}>
                {applyingRange ? 'Adding years…' : rangeProblem || `Fits ${pick.brand} ${pick.model} from ${range.from || '…'} to ${range.to || '…'} · years not in the list are added automatically`}
              </p>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {groups.length === 0 && (
              <p className={`text-xs ${isVendor ? 'text-amber-600' : 'text-slate-400'}`}>
                {isVendor ? 'Pick a brand and model this part fits — all its years are added; untick any that don’t fit.' : 'No vehicles mapped yet — pick a brand and model (all its years are added), or this part won’t have a Car / Bike type or appear in vehicle searches.'}
              </p>
            )}
            {groups.map((g) => {
              const ys = g.items.map((v) => v.year);
              return (
                <span key={g.key}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${pick.brand === g.brand && pick.model === g.model ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200' : 'bg-slate-100 text-slate-700'}`}>
                  {/* Click a chip → load that brand & model into the dropdowns to change its years */}
                  <button type="button" onClick={() => { setAdding(null); setPick({ type: g.type, brand: g.brand, model: g.model }); }}
                    className="flex items-center gap-1 hover:underline" title="Show in Brand / Model to change years">
                    {g.type === 'BIKE' ? <Bike className="h-3 w-3" /> : <Car className="h-3 w-3" />} {g.label} {Math.min(...ys)}–{Math.max(...ys)} ({ys.length})
                  </button>
                  <button type="button" onClick={() => setVehicles(vehicles.filter((v) => !g.items.includes(v)))} aria-label={`Remove ${g.label}`}><X className="h-3 w-3" /></button>
                </span>
              );
            })}
          </div>
        </div>
      </form>
    </Modal>
  );
}