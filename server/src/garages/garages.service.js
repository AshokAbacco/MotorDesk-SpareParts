// server/src/garages/garages.service.js
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { buildMeta, getPagination } from '../utils/pagination.js';

export async function list(vendorId, query) {
  const pg = getPagination(query);
  const where = { vendorId };
  if (query.q) where.OR = [{ name: { contains: query.q, mode: 'insensitive' } }, { phone: { contains: query.q } }];

  const [garages, total] = await prisma.$transaction([
    prisma.garage.findMany({ where, orderBy: { name: 'asc' }, skip: pg.skip, take: pg.take }),
    prisma.garage.count({ where }),
  ]);

  // Repeat-buyer stats: invoice count + lifetime value
  const stats = await prisma.invoice.groupBy({
    by: ['garageId'],
    where: { vendorId, garageId: { in: garages.map((g) => g.id) } },
    _count: { _all: true },
    _sum: { grandTotal: true },
    _max: { createdAt: true },
  });
  const statMap = new Map(stats.map((s) => [s.garageId, s]));
  const items = garages.map((g) => ({
    ...g,
    totalBills: statMap.get(g.id)?._count._all ?? 0,
    lifetimeValue: statMap.get(g.id)?._sum.grandTotal ?? 0,
    lastPurchase: statMap.get(g.id)?._max.createdAt ?? null,
  }));
  return { items, meta: buildMeta(total, pg) };
}

async function getOwned(vendorId, id) {
  const g = await prisma.garage.findFirst({ where: { id, vendorId } });
  if (!g) throw ApiError.notFound('Garage not found');
  return g;
}
export const getById = getOwned;

export const create = (vendorId, data) => prisma.garage.create({ data: { ...data, gstin: data.gstin || null, vendorId } });

export async function update(vendorId, id, data) {
  await getOwned(vendorId, id);
  return prisma.garage.update({ where: { id }, data });
}

export async function remove(vendorId, id) {
  const g = await getOwned(vendorId, id);
  const bills = await prisma.invoice.count({ where: { garageId: id } });
  if (bills > 0) throw ApiError.badRequest('Garage has billing history and cannot be deleted');
  return prisma.garage.delete({ where: { id } });
}