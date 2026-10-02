// server/src/inventory/inventory.service.js
import { prisma } from '../config/prisma.js';
import { buildProductWhere } from '../products/products.service.js';
import { ApiError } from '../utils/ApiError.js';
import { allowedVehicleTypes, INVENTORY_TYPE_LABELS } from '../utils/inventoryType.js';
import { buildMeta, getPagination } from '../utils/pagination.js';

const FREE_SKU_LIMIT = 50; // when vendor has no active subscription

const include = {
  product: { include: { vehicleMappings: { include: { vehicle: true } } } },
};

export async function list(vendorId, query) {
  const pg = getPagination(query);
  const where = {
    vendorId,
    product: buildProductWhere({
      q: query.q, category: query.category, vehicleType: query.vehicleType,
      vehicleBrand: query.vehicleBrand, vehicleModel: query.vehicleModel, includeInactive: true,
    }),
  };
  if (query.stockStatus === 'OUT') where.stock = 0;
  if (query.stockStatus === 'IN_STOCK') where.stock = { gt: 0 };
  if (query.stockStatus === 'LOW') {
    where.AND = [{ stock: { gt: 0 } }, { stock: { lte: prisma.inventory.fields.lowStockThreshold } }];
  }

  const [items, total] = await prisma.$transaction([
    prisma.inventory.findMany({ where, include, orderBy: { updatedAt: 'desc' }, skip: pg.skip, take: pg.take }),
    prisma.inventory.count({ where }),
  ]);
  return { items, meta: buildMeta(total, pg) };
}

async function getOwned(vendorId, id) {
  const item = await prisma.inventory.findFirst({ where: { id, vendorId }, include });
  if (!item) throw ApiError.notFound('Inventory item not found');
  return item;
}
export const getById = getOwned;

async function skuLimit(vendorId) {
  const sub = await prisma.subscription.findFirst({
    where: { vendorId, status: 'ACTIVE', endDate: { gt: new Date() } },
    include: { plan: true },
    orderBy: { endDate: 'desc' },
  });
  return sub?.plan.maxSkus ?? FREE_SKU_LIMIT;
}

export async function add(vendorId, data, inventoryType = 'BOTH') {
  const product = await prisma.product.findUnique({
    where: { id: data.productId },
    include: { vehicleMappings: { select: { vehicle: { select: { type: true } } } } },
  });
  // Master catalog products, or this shop's own products — never another shop's
  if (!product || !product.isActive || (product.vendorId && product.vendorId !== vendorId)) {
    throw ApiError.notFound('Product not found in the catalog');
  }

  // A car-only shop can't stock bike-only parts (and vice versa). Universal parts (no mapping) are allowed.
  const fits = [...new Set(product.vehicleMappings.map((m) => m.vehicle.type))];
  const allowed = allowedVehicleTypes(inventoryType);
  if (fits.length && !fits.some((t) => allowed.includes(t))) {
    throw ApiError.forbidden(
      `Your shop is set up for ${INVENTORY_TYPE_LABELS[inventoryType].toLowerCase()} only. Change "What you sell" in Profile to add ${fits[0].toLowerCase()} parts.`
    );
  }
  const existing = await prisma.inventory.findUnique({ where: { vendorId_productId: { vendorId, productId: data.productId } } });
  if (existing) throw ApiError.conflict(`${product.name} is already in your inventory — update its stock instead`);

  const [count, limit] = await Promise.all([prisma.inventory.count({ where: { vendorId } }), skuLimit(vendorId)]);
  if (count >= limit) throw ApiError.forbidden(`SKU limit (${limit}) reached for your plan. Upgrade to add more.`);

  return prisma.inventory.create({ data: { ...data, vendorId }, include });
}

export async function update(vendorId, id, data) {
  const item = await getOwned(vendorId, id);
  const price = data.price ?? Number(item.price);
  const mrp = data.mrp ?? Number(item.mrp);
  if (price > mrp) throw ApiError.badRequest('Selling price cannot exceed MRP');
  return prisma.inventory.update({ where: { id }, data, include });
}

export async function adjustStock(vendorId, id, { change }) {
  await getOwned(vendorId, id);
  // Conditional update prevents stock going negative under concurrent sales
  const result = await prisma.inventory.updateMany({
    where: { id, vendorId, ...(change < 0 && { stock: { gte: -change } }) },
    data: { stock: { increment: change } },
  });
  if (result.count === 0) throw ApiError.badRequest('Not enough stock to reduce by that amount');
  return getOwned(vendorId, id);
}

export async function remove(vendorId, id) {
  await getOwned(vendorId, id);
  const used = await prisma.invoiceItem.count({ where: { inventoryId: id } }) + await prisma.orderItem.count({ where: { inventoryId: id } });
  if (used > 0) {
    // Keep history intact: unlist and zero out instead of deleting
    return prisma.inventory.update({ where: { id }, data: { isListed: false, stock: 0 } });
  }
  return prisma.inventory.delete({ where: { id } });
}