// server/src/utils/inventoryType.js
// A shop's inventory type (CAR / BIKE / BOTH) decides which vehicle types it can stock.

export const INVENTORY_TYPES = ['CAR', 'BIKE', 'BOTH'];

export const INVENTORY_TYPE_LABELS = { CAR: 'Car parts', BIKE: 'Bike parts', BOTH: 'Car & bike parts' };

/** ['CAR'] | ['BIKE'] | ['CAR', 'BIKE'] */
export const allowedVehicleTypes = (inventoryType) =>
  inventoryType === 'CAR' ? ['CAR'] : inventoryType === 'BIKE' ? ['BIKE'] : ['CAR', 'BIKE'];

export const canStock = (inventoryType, vehicleType) => allowedVehicleTypes(inventoryType).includes(vehicleType);