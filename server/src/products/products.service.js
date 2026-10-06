// server/src/products/products.service.js
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { allowedVehicleTypes, INVENTORY_TYPE_LABELS } from '../utils/inventoryType.js';
import { buildMeta, getPagination } from '../utils/pagination.js';

const withVehicles = {
  vehicleMappings: { include: { vehicle: true } },
  vendor: { select: { id: true, shopName: true } }, // owner shop (null = master catalog)
};

/*
 * Who owns a product:
 *   vendorId = null  → master catalog, created by the admin, visible to every shop
 *   vendorId = <id>  → a shop's own product, visible and editable only by that shop (and the admin)
 * `viewer` = { role, vendorId, inventoryType } built by the controller from the logged-in user.
 */

/** Shared filter builder — also used by marketplace & inventory search */
export function buildProductWhere(f = {}) {
  const where = {};
  if (!f.includeInactive) where.isActive = true;
  if (f.q) {
    where.OR = [
      { name: { contains: f.q, mode: 'insensitive' } },
      { oemNumber: { contains: f.q, mode: 'insensitive' } },
      { brand: { contains: f.q, mode: 'insensitive' } },
      { category: { contains: f.q, mode: 'insensitive' } },
      { vehicleMappings: { some: { vehicle: { OR: [
        { model: { contains: f.q, mode: 'insensitive' } },
        { brand: { contains: f.q, mode: 'insensitive' } },
      ] } } } },
    ];
  }
  if (f.category) where.category = { equals: f.category, mode: 'insensitive' };
  if (f.subCategory) where.subCategory = { equals: f.subCategory, mode: 'insensitive' };
  if (f.brand) where.brand = { equals: f.brand, mode: 'insensitive' };

  const vehicle = {};
  if (f.vehicleId) vehicle.id = f.vehicleId;
  if (f.vehicleType) vehicle.type = f.vehicleType;
  if (f.vehicleBrand) vehicle.brand = { equals: f.vehicleBrand, mode: 'insensitive' };
  if (f.vehicleModel) vehicle.model = { equals: f.vehicleModel, mode: 'insensitive' };
  if (f.year) vehicle.year = f.year;
  if (Object.keys(vehicle).length) where.vehicleMappings = { some: { vehicle } };

  return where;
}

/** Which products a viewer may see in the catalog */
function visibilityWhere(viewer, { owner, includeInactive }) {
  if (viewer.role === 'ADMIN') {
    const where = {};
    if (!includeInactive) where.isActive = true;
    if (owner === 'MASTER') where.vendorId = null;
    if (owner === 'VENDOR') where.vendorId = { not: null };
    return where;
  }
  if (viewer.role === 'VENDOR') {
    const stockedByMe = { inventory: { some: { vendorId: viewer.vendorId } } };
    // "My products" = parts this shop has added & priced, plus the parts it created
    // (also the ones it hid, so they can be restored)
    if (owner === 'MINE') return { OR: [{ vendorId: viewer.vendorId }, stockedByMe] };
    // Browsing ("All parts" / "Master catalog") only offers parts this shop hasn't added yet
    const notStocked = { inventory: { none: { vendorId: viewer.vendorId } } };
    if (owner === 'MASTER') return { vendorId: null, isActive: true, ...notStocked };
    return { ...notStocked, OR: [{ vendorId: null, isActive: true }, { vendorId: viewer.vendorId, isActive: true }] };
  }
  return { vendorId: null, isActive: true };
}

export async function list(query, viewer) {
  const pg = getPagination(query);
  const where = { AND: [buildProductWhere({ ...query, includeInactive: true }), visibilityWhere(viewer, query)] };
  // A shop also gets its own price & stock for each part (null = not added yet)
  const include = viewer.role === 'VENDOR'
    ? { ...withVehicles, inventory: { where: { vendorId: viewer.vendorId }, select: { id: true, price: true, mrp: true, stock: true, isListed: true } } }
    : withVehicles;
  const [rows, total] = await prisma.$transaction([
    prisma.product.findMany({ where, include, orderBy: { createdAt: 'desc' }, skip: pg.skip, take: pg.take }),
    prisma.product.count({ where }),
  ]);
  const items = viewer.role === 'VENDOR'
    ? rows.map(({ inventory, ...p }) => ({ ...p, myInventory: inventory[0] ?? null }))
    : rows;
  return { items, meta: buildMeta(total, pg) };
}

const canSee = (product, viewer) =>
  viewer.role === 'ADMIN' || product.vendorId === null || product.vendorId === viewer.vendorId;

export async function getById(id, viewer) {
  const product = await prisma.product.findUnique({ where: { id }, include: withVehicles });
  if (!product || !canSee(product, viewer)) throw ApiError.notFound('Product not found');
  return product;
}

export async function categories() {
  const rows = await prisma.product.groupBy({
    by: ['category', 'subCategory'],
    where: { isActive: true },
    orderBy: { category: 'asc' },
  });
  const map = {};
  for (const r of rows) {
    map[r.category] ??= [];
    if (r.subCategory) map[r.category].push(r.subCategory);
  }
  return Object.entries(map).map(([name, subCategories]) => ({ name, subCategories }));
}

/** Loads a product the viewer is allowed to change: admin → any, vendor → only its own */
async function getEditable(id, viewer) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product || !canSee(product, viewer)) throw ApiError.notFound('Product not found');
  if (viewer.role === 'VENDOR' && product.vendorId !== viewer.vendorId) {
    throw ApiError.forbidden('Master catalog products are managed by MotorDesk. You can only edit products your shop added.');
  }
  return product;
}

/** OEM numbers are unique inside the master catalog and inside each shop's own list */
async function assertOemFree(oemNumber, ownerVendorId, exceptId) {
  const clash = await prisma.product.findFirst({
    where: {
      oemNumber: { equals: oemNumber, mode: 'insensitive' },
      vendorId: ownerVendorId ?? null,
      ...(exceptId && { id: { not: exceptId } }),
    },
    select: { name: true },
  });
  if (clash) throw ApiError.conflict(`OEM ${oemNumber} is already used by "${clash.name}"${ownerVendorId ? ' in your products' : ' in the master catalog'}`);

  // A shop shouldn't duplicate a part the master catalog already has — it can simply stock that one
  if (ownerVendorId) {
    const master = await prisma.product.findFirst({
      where: { oemNumber: { equals: oemNumber, mode: 'insensitive' }, vendorId: null, isActive: true },
      select: { name: true },
    });
    if (master) throw ApiError.conflict(`OEM ${oemNumber} is already in the master catalog as "${master.name}". Add it to your inventory from the catalog list instead.`);
  }
}

/** Shop products must fit at least one vehicle, and only vehicle types the shop sells */
async function assertVendorFitment(vehicleIds, viewer) {
  if (viewer.role !== 'VENDOR' || vehicleIds === undefined) return;
  if (!vehicleIds.length) throw ApiError.badRequest('Select at least one vehicle this part fits');
  const vehicles = await prisma.vehicle.findMany({ where: { id: { in: vehicleIds } }, select: { type: true } });
  if (vehicles.length !== new Set(vehicleIds).size) throw ApiError.badRequest('One of the selected vehicles no longer exists');
  const allowed = allowedVehicleTypes(viewer.inventoryType);
  const bad = vehicles.find((v) => !allowed.includes(v.type));
  if (bad) {
    throw ApiError.forbidden(`Your shop sells ${INVENTORY_TYPE_LABELS[viewer.inventoryType].toLowerCase()} only — remove the ${bad.type.toLowerCase()} fitment.`);
  }
}

export async function create({ vehicleIds, ...data }, viewer) {
  const vendorId = viewer.role === 'VENDOR' ? viewer.vendorId : null;
  await assertOemFree(data.oemNumber, vendorId);
  await assertVendorFitment(vehicleIds, viewer);
  return prisma.product.create({
    data: { ...data, vendorId, vehicleMappings: { create: [...new Set(vehicleIds)].map((vehicleId) => ({ vehicleId })) } },
    include: withVehicles,
  });
}

export async function update(id, { vehicleIds, ...data }, viewer) {
  const product = await getEditable(id, viewer);
  if (data.oemNumber && data.oemNumber.toUpperCase() !== product.oemNumber.toUpperCase()) {
    await assertOemFree(data.oemNumber, product.vendorId, id);
  }
  await assertVendorFitment(vehicleIds, viewer);
  return prisma.$transaction(async (tx) => {
    await tx.product.update({ where: { id }, data });
    if (vehicleIds) {
      await tx.vehicleMapping.deleteMany({ where: { productId: id } });
      await tx.vehicleMapping.createMany({ data: [...new Set(vehicleIds)].map((vehicleId) => ({ productId: id, vehicleId })) });
    }
    return tx.product.findUnique({ where: { id }, include: withVehicles });
  });
}

/** Soft delete: shops may hold stock or bills of it, so we only hide it */
export async function remove(id, viewer) {
  await getEditable(id, viewer);
  return prisma.product.update({ where: { id }, data: { isActive: false } });
}

export const setVehicles = (id, vehicleIds, viewer) => update(id, { vehicleIds }, viewer);