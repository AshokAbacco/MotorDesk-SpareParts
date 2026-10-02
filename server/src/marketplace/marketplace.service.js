// server/src/marketplace/marketplace.service.js
import { prisma } from '../config/prisma.js';
import { buildProductWhere } from '../products/products.service.js';
import { ApiError } from '../utils/ApiError.js';
import { round2 } from '../utils/money.js';
import { buildMeta, getPagination } from '../utils/pagination.js';

// A sellable offer: listed, in stock, from an approved shop
const offerWhere = { isListed: true, stock: { gt: 0 }, vendor: { status: 'APPROVED' } };
const offerSelect = {
  id: true, price: true, mrp: true, stock: true,
  vendor: { select: { id: true, shopName: true, city: true, state: true } },
};

const withGst = (price, rate) => round2(Number(price) * (1 + Number(rate) / 100));

function shapeOffer(o, gstRate) {
  return {
    inventoryId: o.id,
    price: Number(o.price),
    priceWithGst: withGst(o.price, gstRate),
    mrp: Number(o.mrp),
    inStock: o.stock,
    discountPct: Number(o.mrp) > 0 ? Math.max(0, Math.round((1 - withGst(o.price, gstRate) / Number(o.mrp)) * 100)) : 0,
    vendor: o.vendor,
  };
}

/** Card shape used by product lists: product + cheapest offer + number of shops selling it */
const toCard = ({ inventory, ...p }) => ({ ...p, bestOffer: shapeOffer(inventory[0], p.gstRate), offerCount: inventory.length });

export async function browse(query) {
  const pg = getPagination(query, { defaultLimit: 24 });
  const where = { ...buildProductWhere(query), inventory: { some: offerWhere } };

  const orderBy = query.sort === 'newest' ? { createdAt: 'desc' } : { name: 'asc' };
  const [products, total] = await prisma.$transaction([
    prisma.product.findMany({
      where, orderBy, skip: pg.skip, take: pg.take,
      include: {
        inventory: { where: offerWhere, select: offerSelect, orderBy: { price: 'asc' } },
        vehicleMappings: { include: { vehicle: true }, take: 5 },
      },
    }),
    prisma.product.count({ where }),
  ]);

  let items = products.map(toCard);
  // Price sort within the page (full DB price sort would need a materialised min-price column)
  if (query.sort === 'price_asc') items.sort((a, b) => a.bestOffer.price - b.bestOffer.price);
  if (query.sort === 'price_desc') items.sort((a, b) => b.bestOffer.price - a.bestOffer.price);

  return { items, meta: buildMeta(total, pg) };
}

export async function productDetail(id) {
  const product = await prisma.product.findFirst({
    where: { id, isActive: true },
    include: {
      inventory: { where: offerWhere, select: offerSelect, orderBy: { price: 'asc' } },
      vehicleMappings: { include: { vehicle: true } },
    },
  });
  if (!product) throw ApiError.notFound('Product not found');
  const { inventory, ...rest } = product;
  return { ...rest, offers: inventory.map((o) => shapeOffer(o, product.gstRate)) };
}

/**
 * "Related parts" + "More parts" rows under a product page (like Flipkart / Amazon).
 * Related = in-stock parts in this order (category always wins — open a Brake part → Brake parts first):
 *   1. Same category (e.g. Brakes) — inside it: same vehicle model, then same car/bike type, then same sub-category
 *   2. Then other categories that fit the same vehicle model, then the same car/bike type
 *   Parts from another category AND only for the other vehicle type are not "related" — they go to "More".
 * More = other in-stock parts, same vehicle type first, newest first.
 */
export async function related(id, { limit = 12 } = {}) {
  const product = await prisma.product.findFirst({
    where: { id, isActive: true },
    include: { vehicleMappings: { select: { vehicle: { select: { type: true, brand: true, model: true } } } } },
  });
  if (!product) throw ApiError.notFound('Product not found');

  const fits = product.vehicleMappings.map((m) => m.vehicle);
  const modelKey = (v) => `${v.type}|${v.brand}|${v.model}`.toLowerCase();
  const myModels = new Set(fits.map(modelKey));
  const myTypes = new Set(fits.map((v) => v.type));
  const models = [...new Map(fits.map((v) => [modelKey(v), v])).values()];

  // Only master-catalog products or shop products that are actually on sale; never this product
  const base = { id: { not: id }, isActive: true, inventory: { some: offerWhere } };
  const include = {
    inventory: { where: offerWhere, select: offerSelect, orderBy: { price: 'asc' } },
    vehicleMappings: { include: { vehicle: true } },
  };

  const candidates = await prisma.product.findMany({
    where: {
      ...base,
      OR: [
        { category: { equals: product.category, mode: 'insensitive' } },
        ...models.map((v) => ({ vehicleMappings: { some: { vehicle: { type: v.type, brand: v.brand, model: v.model } } } })),
        ...(myTypes.size ? [{ vehicleMappings: { some: { vehicle: { type: { in: [...myTypes] } } } } }] : []),
      ],
    },
    include,
    orderBy: { createdAt: 'desc' },
    take: 120,
  });

  const scored = candidates
    .map((c) => {
      const cFits = c.vehicleMappings.map((m) => m.vehicle);
      const sameCategory = c.category.toLowerCase() === product.category.toLowerCase();
      const sameSub = Boolean(c.subCategory && product.subCategory && c.subCategory.toLowerCase() === product.subCategory.toLowerCase());
      const sameModel = cFits.some((v) => myModels.has(modelKey(v)));
      const sameType = !myTypes.size || !cFits.length || cFits.some((v) => myTypes.has(v.type));
      // Weights keep the tiers apart: any same-category part (≥100) always beats any other part (≤60)
      const score = (sameCategory ? 100 : 0) + (sameModel ? 30 : 0) + (sameType ? 20 : 0) + (sameSub ? 10 : 0);
      return { c, score, sameCategory };
    })
    .filter(({ score }) => score >= 20) // same category, or at least the same car/bike type
    .sort((a, b) => b.score - a.score || b.c.inventory.length - a.c.inventory.length || a.c.name.localeCompare(b.c.name))
    .slice(0, limit)
    .map(({ c, sameCategory }) => ({ ...c, sameCategory }));

  const used = [id, ...scored.map((c) => c.id)];
  const others = await prisma.product.findMany({
    where: { ...base, id: { notIn: used } },
    include,
    orderBy: { createdAt: 'desc' },
    take: limit * 2,
  });
  const sameTypeFirst = others
    .map((c) => ({ c, same: c.vehicleMappings.some((m) => myTypes.has(m.vehicle.type)) ? 1 : 0 }))
    .sort((a, b) => b.same - a.same)
    .slice(0, limit)
    .map(({ c }) => c);

  // Cards only need a few fitment rows for the "Fits …" line
  const card = (c) => toCard({ ...c, vehicleMappings: c.vehicleMappings.slice(0, 5) });
  return { category: product.category, related: scored.map(card), more: sameTypeFirst.map(card) };
}

/** Re-checks cart items against live price & stock before checkout */
export async function validateCart(items) {
  const rows = await prisma.inventory.findMany({
    where: { id: { in: items.map((i) => i.inventoryId) } },
    include: { product: true, vendor: { select: { id: true, shopName: true, status: true, upiId: true } } },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return items.map((i) => {
    const r = byId.get(i.inventoryId);
    const available = r && r.isListed && r.product.isActive && r.vendor.status === 'APPROVED' && r.stock > 0;
    return {
      inventoryId: i.inventoryId,
      requestedQty: i.quantity,
      available: Boolean(available),
      maxQty: available ? r.stock : 0,
      price: r ? Number(r.price) : 0,
      priceWithGst: r ? withGst(r.price, r.product.gstRate) : 0,
      gstRate: r ? Number(r.product.gstRate) : 0,
      vendorName: r?.vendor.shopName ?? null,
      upiEnabled: Boolean(r?.vendor.upiId), // this shop can be paid directly by UPI
    };
  });
}