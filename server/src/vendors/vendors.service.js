// server/src/vendors/vendors.service.js
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { allowedVehicleTypes, INVENTORY_TYPE_LABELS } from '../utils/inventoryType.js';

export const getShop = (vendorId) =>
  prisma.vendor.findUnique({
    where: { id: vendorId },
    include: {
      user: { select: { name: true, email: true } },
      subscriptions: { where: { status: 'ACTIVE' }, include: { plan: true }, orderBy: { endDate: 'desc' }, take: 1 },
    },
  });

export async function updateShop(vendorId, data) {
  if (data.inventoryType) await assertCanSwitchInventoryType(vendorId, data.inventoryType);
  return prisma.vendor.update({ where: { id: vendorId }, data: { ...data, gstin: data.gstin === '' ? null : data.gstin } });
}

/**
 * Switching e.g. BOTH → CAR would hide the Bike menus, so the shop must first
 * remove (unlist) the bike-only parts it still sells.
 */
async function assertCanSwitchInventoryType(vendorId, inventoryType) {
  const keep = allowedVehicleTypes(inventoryType);
  const dropped = ['CAR', 'BIKE'].filter((t) => !keep.includes(t));
  if (!dropped.length) return;

  const stranded = await prisma.inventory.count({
    where: {
      vendorId,
      isListed: true,
      product: {
        vehicleMappings: { some: { vehicle: { type: { in: dropped } } } },
        NOT: { vehicleMappings: { some: { vehicle: { type: { in: keep } } } } },
      },
    },
  });
  if (stranded) {
    const what = dropped[0] === 'BIKE' ? 'bike' : 'car';
    throw ApiError.badRequest(
      `You still have ${stranded} ${what} part${stranded > 1 ? 's' : ''} in inventory. Remove ${stranded > 1 ? 'them' : 'it'} from "${what === 'bike' ? 'Bike' : 'Car'} parts" first, then switch to ${INVENTORY_TYPE_LABELS[inventoryType]}.`
    );
  }
}

// ─────────────── UPI settings (customers pay this shop directly) ───────────────

const upiSelect = { upiId: true, upiName: true, upiNumber: true, shopName: true };

export const getUpi = (vendorId) => prisma.vendor.findUnique({ where: { id: vendorId }, select: upiSelect });

export const updateUpi = (vendorId, { upiId, upiName, upiNumber }) =>
  prisma.vendor.update({ where: { id: vendorId }, data: { upiId, upiName, upiNumber: upiNumber || null }, select: upiSelect });

export const removeUpi = (vendorId) =>
  prisma.vendor.update({ where: { id: vendorId }, data: { upiId: null, upiName: null, upiNumber: null }, select: upiSelect });
// ─────────────── Order options (COD / delivery) ───────────────

const orderSettingsSelect = { codEnabled: true, deliveryEnabled: true, deliveryCharge: true, upiId: true };
const shapeOrderSettings = ({ upiId, deliveryCharge, ...v }) => ({ ...v, deliveryCharge: Number(deliveryCharge), upiEnabled: Boolean(upiId) });

export const getOrderSettings = async (vendorId) =>
  shapeOrderSettings(await prisma.vendor.findUnique({ where: { id: vendorId }, select: orderSettingsSelect }));

export async function updateOrderSettings(vendorId, { codEnabled, deliveryEnabled, deliveryCharge }) {
  const updated = await prisma.vendor.update({
    where: { id: vendorId },
    data: { codEnabled, deliveryEnabled, deliveryCharge: deliveryEnabled ? deliveryCharge : 0 },
    select: orderSettingsSelect,
  });
  return shapeOrderSettings(updated);
}
