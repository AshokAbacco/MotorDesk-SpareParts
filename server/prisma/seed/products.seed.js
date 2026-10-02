// server/prisma/seed/products.seed.js
// fits: [type, brand, model] → mapped to every seeded year of that model
const PRODUCTS = [
  // ---------- CAR ----------
  { name: 'Front Brake Pad Set', category: 'Brakes', subCategory: 'Brake Pads', brand: 'Bosch', oemNumber: '55800M68K00', hsnCode: '87083000', gstRate: 28, fits: [['CAR', 'Maruti Suzuki', 'Swift'], ['CAR', 'Maruti Suzuki', 'Baleno']] },
  { name: 'Oil Filter', category: 'Filters', subCategory: 'Oil Filter', brand: 'Maruti Genuine Parts', oemNumber: '16510M68K00', hsnCode: '84212300', gstRate: 18, fits: [['CAR', 'Maruti Suzuki', 'Swift'], ['CAR', 'Maruti Suzuki', 'Baleno']] },
  { name: 'Air Filter Element', category: 'Filters', subCategory: 'Air Filter', brand: 'Mann Filter', oemNumber: '13780M68K00', hsnCode: '84213100', gstRate: 18, fits: [['CAR', 'Maruti Suzuki', 'Swift']] },
  { name: 'Cabin AC Filter', category: 'Filters', subCategory: 'Cabin Filter', brand: 'Purolator', oemNumber: '97133H8000', hsnCode: '84213100', gstRate: 18, fits: [['CAR', 'Hyundai', 'Creta'], ['CAR', 'Hyundai', 'i20']] },
  { name: 'Front Shock Absorber', category: 'Suspension', subCategory: 'Shock Absorber', brand: 'Gabriel', oemNumber: '54650BV000', hsnCode: '87088000', gstRate: 28, fits: [['CAR', 'Hyundai', 'Creta']] },
  { name: 'Clutch Plate Kit', category: 'Transmission', subCategory: 'Clutch', brand: 'Valeo', oemNumber: '41100-2B010', hsnCode: '87089300', gstRate: 28, fits: [['CAR', 'Hyundai', 'i20'], ['CAR', 'Hyundai', 'Creta']] },
  { name: 'Headlight Assembly (Left)', category: 'Lighting', subCategory: 'Headlight', brand: 'Lumax', oemNumber: '285540120101', hsnCode: '85122010', gstRate: 28, fits: [['CAR', 'Tata', 'Nexon']] },
  { name: 'Wiper Blade Set 22"/16"', category: 'Body & Exterior', subCategory: 'Wipers', brand: 'Bosch', oemNumber: '3397014214', hsnCode: '85124000', gstRate: 28, fits: [['CAR', 'Tata', 'Nexon'], ['CAR', 'Honda', 'City']] },
  { name: 'Spark Plug (Iridium)', category: 'Engine', subCategory: 'Ignition', brand: 'NGK', oemNumber: '98079-5614E', hsnCode: '85111000', gstRate: 28, fits: [['CAR', 'Honda', 'City']] },
  { name: 'Radiator Coolant 1L', category: 'Engine', subCategory: 'Cooling', brand: 'Castrol', oemNumber: 'CST-RC-1L', hsnCode: '38200000', gstRate: 18, fits: [['CAR', 'Honda', 'City'], ['CAR', 'Toyota', 'Innova Crysta']] },
  { name: 'Fuel Filter', category: 'Filters', subCategory: 'Fuel Filter', brand: 'Toyota Genuine', oemNumber: '23390-0L070', hsnCode: '84212300', gstRate: 18, fits: [['CAR', 'Toyota', 'Innova Crysta']] },
  { name: 'Rear Brake Shoe Set', category: 'Brakes', subCategory: 'Brake Shoes', brand: 'Brembo', oemNumber: '0401AB0010N', hsnCode: '87083000', gstRate: 28, fits: [['CAR', 'Mahindra', 'Scorpio N']] },
  // ---------- BIKE ----------
  { name: 'Chain Sprocket Kit', category: 'Transmission', subCategory: 'Chain Kit', brand: 'Rolon', oemNumber: '40530-KTE-910', hsnCode: '87141090', gstRate: 28, fits: [['BIKE', 'Hero', 'Splendor Plus']] },
  { name: 'Engine Oil 10W-30 (1L)', category: 'Lubricants', subCategory: 'Engine Oil', brand: 'Hero Genuine', oemNumber: 'HGO-10W30-1L', hsnCode: '27101980', gstRate: 18, fits: [['BIKE', 'Hero', 'Splendor Plus']] },
  { name: 'Front Brake Shoe', category: 'Brakes', subCategory: 'Brake Shoes', brand: 'Honda Genuine', oemNumber: '06455-K0L-D01', hsnCode: '87141090', gstRate: 28, fits: [['BIKE', 'Honda', 'Activa 6G']] },
  { name: 'V-Belt (Drive Belt)', category: 'Transmission', subCategory: 'Belt', brand: 'Bando', oemNumber: '23100-K0L-D01', hsnCode: '40103999', gstRate: 18, fits: [['BIKE', 'Honda', 'Activa 6G']] },
  { name: 'Disc Brake Pad (Front)', category: 'Brakes', subCategory: 'Brake Pads', brand: 'Endurance', oemNumber: 'JF201042', hsnCode: '87141090', gstRate: 28, fits: [['BIKE', 'Bajaj', 'Pulsar 150'], ['BIKE', 'TVS', 'Apache RTR 160']] },
  { name: 'Clutch Cable', category: 'Controls', subCategory: 'Cables', brand: 'Bajaj Genuine', oemNumber: 'JE531052', hsnCode: '87141090', gstRate: 28, fits: [['BIKE', 'Bajaj', 'Pulsar 150']] },
  { name: 'Air Filter', category: 'Filters', subCategory: 'Air Filter', brand: 'RE Genuine', oemNumber: '888457', hsnCode: '84213100', gstRate: 18, fits: [['BIKE', 'Royal Enfield', 'Classic 350']] },
  { name: 'Spark Plug', category: 'Engine', subCategory: 'Ignition', brand: 'NGK', oemNumber: 'CPR8EA-9', hsnCode: '85111000', gstRate: 28, fits: [['BIKE', 'TVS', 'Apache RTR 160'], ['BIKE', 'Yamaha', 'FZ-S V3']] },
  { name: 'Rear Shock Absorber', category: 'Suspension', subCategory: 'Shock Absorber', brand: 'Gabriel', oemNumber: 'B6F-F2210-00', hsnCode: '87141090', gstRate: 28, fits: [['BIKE', 'Yamaha', 'FZ-S V3']] },
  { name: 'Headlight Bulb 12V 35/35W', category: 'Lighting', subCategory: 'Bulbs', brand: 'Philips', oemNumber: 'PH-12V3535', hsnCode: '85392990', gstRate: 18, fits: [['BIKE', 'Hero', 'Splendor Plus'], ['BIKE', 'Honda', 'Activa 6G'], ['BIKE', 'Bajaj', 'Pulsar 150']] },
];

export async function seedProducts(prisma, vehicles) {
  const products = [];
  for (const { fits, ...p } of PRODUCTS) {
    const vehicleIds = vehicles
      .filter((v) => fits.some(([type, brand, model]) => v.type === type && v.brand === brand && v.model === model))
      .map((v) => v.id);

    // Master catalog product (vendorId null) — created once, left untouched on re-runs
    const product =
      (await prisma.product.findFirst({ where: { oemNumber: p.oemNumber, vendorId: null } })) ??
      (await prisma.product.create({
        data: { ...p, description: `${p.brand} ${p.name}. Direct-fit replacement, quality checked.`, images: [] },
      }));
    // Map every seeded model-year (also picks up newly added years on re-runs)
    await prisma.vehicleMapping.createMany({
      data: vehicleIds.map((vehicleId) => ({ productId: product.id, vehicleId })),
      skipDuplicates: true,
    });
    // vehicleTypes lets the inventory seed respect each shop's Car / Bike / Both setting
    products.push({ ...product, vehicleTypes: [...new Set(fits.map(([type]) => type))] });
  }
  console.log(`  products: ${products.length}`);
  return products;
}