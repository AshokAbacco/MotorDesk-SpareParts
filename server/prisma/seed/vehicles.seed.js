// server/prisma/seed/vehicles.seed.js
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

// [brand, model, firstYear, lastYear]
const CARS = [
  ['Maruti Suzuki', 'Swift', 2018, 2026],
  ['Maruti Suzuki', 'Baleno', 2019, 2026],
  ['Hyundai', 'Creta', 2020, 2026],
  ['Hyundai', 'i20', 2020, 2026],
  ['Tata', 'Nexon', 2020, 2026],
  ['Honda', 'City', 2017, 2026],
  ['Mahindra', 'Scorpio N', 2022, 2026],
  ['Toyota', 'Innova Crysta', 2016, 2025],
];

const BIKES = [
  ['Hero', 'Splendor Plus', 2018, 2026],
  ['Honda', 'Activa 6G', 2020, 2026],
  ['Bajaj', 'Pulsar 150', 2017, 2026],
  ['Royal Enfield', 'Classic 350', 2021, 2026],
  ['TVS', 'Apache RTR 160', 2018, 2026],
  ['Yamaha', 'FZ-S V3', 2019, 2026],
];

export async function seedVehicles(prisma) {
  const data = [];
  for (const [brand, model, from, to] of CARS) for (const year of range(from, to)) data.push({ type: 'CAR', brand, model, year });
  for (const [brand, model, from, to] of BIKES) for (const year of range(from, to)) data.push({ type: 'BIKE', brand, model, year });

  await prisma.vehicle.createMany({ data, skipDuplicates: true });
  const vehicles = await prisma.vehicle.findMany();
  console.log(`  vehicles: ${vehicles.length} (${CARS.length} car + ${BIKES.length} bike models)`);
  return vehicles;
}