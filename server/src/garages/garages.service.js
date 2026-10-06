// server/src/garages/garages.service.js
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { buildMeta, getPagination } from '../utils/pagination.js';
import { crmGarageKey, getVisibleCrmGarages, hiddenCrmIds, isCrmGarageId, peekCrmGarages } from './garageCrm.js';

const matches = (g, q) => {
  if (!q) return true;
  const t = q.toLowerCase();
  return [g.name, g.ownerName, g.phone, g.email, g.gstin].some((v) => v?.toLowerCase().includes(t));
};

/**
 * Garages (B2B) list with three tabs:
 *   ALL        — MotorDesk garages + this shop's own garages
 *   MOTORDESK  — garages registered in the MotorDesk Garage CRM (same list for every shop, read-only here)
 *   OWN        — garages this shop added itself (no other shop ever sees them)
 * Bills / lifetime value / last purchase are always this shop's own sales to that garage.
 */
export async function list(vendorId, query) {
  const source = query.source ?? 'ALL';
  const pg = getPagination(query, { maxLimit: 1000 });

  const ownWhere = { vendorId };
  if (query.q) ownWhere.OR = [
    { name: { contains: query.q, mode: 'insensitive' } }, { phone: { contains: query.q } },
    { ownerName: { contains: query.q, mode: 'insensitive' } }, { gstin: { contains: query.q, mode: 'insensitive' } },
    { email: { contains: query.q, mode: 'insensitive' } },
  ];

  // The "Own" tab never waits for the CRM; the other tabs fetch it (cached for a few minutes).
  // Garages the admin hid (Admin → MotorDesk Garages) are never shown to shops.
  const [ownRows, crm] = await Promise.all([
    prisma.garage.findMany({ where: ownWhere, orderBy: { name: 'asc' } }),
    source === 'OWN'
      ? hiddenCrmIds().then((hidden) => ({ garages: peekCrmGarages()?.filter((g) => !hidden.has(g.crmId)) ?? null, status: null }))
      : getVisibleCrmGarages(),
  ]);
  const own = ownRows.map((g) => ({ ...g, source: 'OWN' }));
  const motordesk = (crm.garages ?? []).filter((g) => matches(g, query.q));

  const rows = source === 'OWN' ? own
    : source === 'MOTORDESK' ? motordesk
      : [...own, ...motordesk].sort((a, b) => a.name.localeCompare(b.name));
  const pageRows = rows.slice(pg.skip, pg.skip + pg.take);

  // Repeat-buyer stats for this shop: own garages by garageId, MotorDesk garages by crmGarageId
  const ownIds = pageRows.filter((g) => g.source === 'OWN').map((g) => g.id);
  const crmIds = pageRows.filter((g) => g.source === 'MOTORDESK').map((g) => g.crmId);
  const agg = { _count: { _all: true }, _sum: { grandTotal: true }, _max: { createdAt: true } };
  const [ownStats, crmStats] = await Promise.all([
    ownIds.length ? prisma.invoice.groupBy({ by: ['garageId'], where: { vendorId, garageId: { in: ownIds } }, ...agg }) : [],
    crmIds.length ? prisma.invoice.groupBy({ by: ['crmGarageId'], where: { vendorId, crmGarageId: { in: crmIds } }, ...agg }) : [],
  ]);
  const statMap = new Map([
    ...ownStats.map((s) => [s.garageId, s]),
    ...crmStats.map((s) => [crmGarageKey(s.crmGarageId), s]),
  ]);
  const items = pageRows.map((g) => {
    const st = statMap.get(g.id);
    return { ...g, totalBills: st?._count._all ?? 0, lifetimeValue: st?._sum.grandTotal ?? 0, lastPurchase: st?._max.createdAt ?? null };
  });

  const crmCount = crm.garages ? motordesk.length : null; // null = not loaded yet
  return {
    items,
    meta: {
      ...buildMeta(rows.length, pg),
      counts: { ALL: crmCount == null ? null : own.length + crmCount, MOTORDESK: crmCount, OWN: own.length },
      ...(crm.status && { crm: crm.status }),
    },
  };
}

async function getOwned(vendorId, id) {
  if (isCrmGarageId(id)) throw ApiError.badRequest('MotorDesk garages are managed in the MotorDesk Garage CRM and cannot be changed here');
  const g = await prisma.garage.findFirst({ where: { id, vendorId } });
  if (!g) throw ApiError.notFound('Garage not found');
  return g;
}
export const getById = getOwned;

export const create = (vendorId, data) => prisma.garage.create({ data: { ...data, gstin: data.gstin || null, email: data.email || null, vendorId } });

export async function update(vendorId, id, data) {
  await getOwned(vendorId, id);
  // '' clears an optional field
  return prisma.garage.update({ where: { id }, data: { ...data, ...(data.email === '' && { email: null }), ...(data.gstin === '' && { gstin: null }) } });
}

export async function remove(vendorId, id) {
  const g = await getOwned(vendorId, id);
  const bills = await prisma.invoice.count({ where: { garageId: id } });
  if (bills > 0) throw ApiError.badRequest('Garage has billing history and cannot be deleted');
  return prisma.garage.delete({ where: { id } });
}