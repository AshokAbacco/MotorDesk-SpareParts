// client/src/shared/utils/inventoryType.js
// What a shop sells (chosen at registration) → which Car / Bike menus and pages it can open.

export const INVENTORY_TYPE_OPTIONS = [
  { value: 'CAR', label: 'Car' },
  { value: 'BIKE', label: 'Bike' },
  { value: 'BOTH', label: 'Both (Car & Bike)' },
];

export const INVENTORY_TYPE_LABELS = { CAR: 'Car parts only', BIKE: 'Bike parts only', BOTH: 'Car & bike parts' };

/** Older sessions saved before this setting existed have no value → full access, same as the server default */
export const allowedVehicles = (inventoryType) =>
  inventoryType === 'CAR' ? ['CAR'] : inventoryType === 'BIKE' ? ['BIKE'] : ['CAR', 'BIKE'];

export const canAccessVehicle = (inventoryType, vehicle) => allowedVehicles(inventoryType).includes(vehicle);