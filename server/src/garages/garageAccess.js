// server/src/garages/garageAccess.js
/**
 * Admin → MotorDesk Garages: decide which Garage CRM garages shops can see.
 * Every CRM garage is visible by default; hiding one stores only its CRM id (HiddenCrmGarage).
 * Hidden garages disappear from every shop's Garages (B2B) page and the POS customer picker.
 * Bills already made to them are kept.
 */
import { prisma } from '../config/prisma.js';
import { buildMeta, getPagination } from '../utils/pagination.js';
import { getCrmGarages } from './garageCrm.js';

const matches = (g, q) => {
  if (!q) return true;
  const t = q.toLowerCase();
  return [g.name, g.ownerName, g.phone, g.email, g.gstin, g.address].some((v) => v?.toLowerCase().includes(t));
};

export async function list({ q, status = 'ALL', refresh = false, ...query }) {
  const pg = getPagination(query, { maxLimit: 200 });
  const [crm, hiddenRows] = await Promise.all([
    getCrmGarages({ force: refresh }),
    prisma.hiddenCrmGarage.findMany(),
  ]);
  const hidden = new Map(hiddenRows.map((h) => [h.crmGarageId, h]));
  const all = crm.garages
    .filter((g) => matches(g, q))
    .map((g) => ({ ...g, isVisible: !hidden.has(g.crmId), hiddenAt: hidden.get(g.crmId)?.hiddenAt ?? null }));

  const rows = status === 'VISIBLE' ? all.filter((g) => g.isVisible) : status === 'HIDDEN' ? all.filter((g) => !g.isVisible) : all;
  const pageRows = rows.slice(pg.skip, pg.skip + pg.take);

  // How much shops have billed each garage (all shops together)
  const stats = pageRows.length
    ? await prisma.invoice.groupBy({
      by: ['crmGarageId'], where: { crmGarageId: { in: pageRows.map((g) => g.crmId) } },
      _count: { _all: true }, _sum: { grandTotal: true },
    })
    : [];
  const statMap = new Map(stats.map((s) => [s.crmGarageId, s]));
  const items = pageRows.map((g) => ({
    ...g,
    totalBills: statMap.get(g.crmId)?._count._all ?? 0,
    totalValue: statMap.get(g.crmId)?._sum.grandTotal ?? 0,
  }));

  const visibleCount = all.filter((g) => g.isVisible).length;
  return {
    items,
    meta: {
      ...buildMeta(rows.length, pg),
      counts: { ALL: all.length, VISIBLE: visibleCount, HIDDEN: all.length - visibleCount },
      crm: crm.status,
    },
  };
}

/** Show or hide one or many CRM garages */
export async function setVisibility(crmIds, visible, adminId) {
  const ids = [...new Set(crmIds)];
  if (visible) {
    const r = await prisma.hiddenCrmGarage.deleteMany({ where: { crmGarageId: { in: ids } } });
    return { changed: r.count, visible };
  }
  const r = await prisma.hiddenCrmGarage.createMany({
    data: ids.map((crmGarageId) => ({ crmGarageId, hiddenById: adminId })),
    skipDuplicates: true,
  });
  return { changed: r.count, visible };
}