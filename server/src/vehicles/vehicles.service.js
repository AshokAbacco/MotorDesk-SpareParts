// server/src/vehicles/vehicles.service.js
import { prisma } from '../config/prisma.js';

const ci = (v) => (v ? { equals: v, mode: 'insensitive' } : undefined);

export const list = ({ type, brand, model }) =>
  prisma.vehicle.findMany({
    where: { type, brand: ci(brand), model: ci(model) },
    orderBy: [{ brand: 'asc' }, { model: 'asc' }, { year: 'desc' }],
  });

// Cascading dropdown helpers: type -> brand -> model -> year
export async function brands(type) {
  const rows = await prisma.vehicle.findMany({ where: { type }, distinct: ['brand'], select: { brand: true }, orderBy: { brand: 'asc' } });
  return rows.map((r) => r.brand);
}
export async function models(type, brand) {
  const rows = await prisma.vehicle.findMany({
    where: { type, brand: ci(brand) }, distinct: ['model'], select: { model: true }, orderBy: { model: 'asc' },
  });
  return rows.map((r) => r.model);
}
export async function years(type, brand, model) {
  const rows = await prisma.vehicle.findMany({
    where: { type, brand: ci(brand), model: ci(model) }, select: { id: true, year: true }, orderBy: { year: 'desc' },
  });
  return rows;
}

export const create = (data) => prisma.vehicle.create({ data });

/**
 * Adds a brand/model for a range of years (new brand, new model, or extra years of an existing model).
 * Re-uses the existing spelling when the brand/model already exists in any letter case,
 * so "hyundai" / "HYUNDAI" never become a second "Hyundai" in the dropdowns.
 * Returns every year-row of that model so the fitment picker can select them straight away.
 */
export async function bulkCreate({ type, brand, model, yearFrom, yearTo }) {
  const sameBrand = await prisma.vehicle.findFirst({ where: { type, brand: ci(brand) }, select: { brand: true } });
  const brandName = sameBrand?.brand ?? brand;
  const sameModel = await prisma.vehicle.findFirst({ where: { type, brand: brandName, model: ci(model) }, select: { model: true } });
  const modelName = sameModel?.model ?? model;

  const data = [];
  for (let year = yearFrom; year <= yearTo; year++) data.push({ type, brand: brandName, model: modelName, year });
  const result = await prisma.vehicle.createMany({ data, skipDuplicates: true });

  const vehicles = await prisma.vehicle.findMany({
    where: { type, brand: brandName, model: modelName, year: { gte: yearFrom, lte: yearTo } },
    orderBy: { year: 'desc' },
  });
  return {
    created: result.count,
    isNewBrand: !sameBrand,
    isNewModel: !sameModel,
    brand: brandName,
    model: modelName,
    vehicles,
  };
}

export const remove = (id) => prisma.vehicle.delete({ where: { id } });