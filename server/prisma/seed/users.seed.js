// server/prisma/seed/users.seed.js
import bcrypt from 'bcryptjs';

export const DEMO_PASSWORD = '123456';

/**
 * Demo accounts. Every run resets their password to DEMO_PASSWORD, so you can
 * always log in with 123456 even after changing it in the app.
 */
export async function seedUsers(prisma) {
  const password = await bcrypt.hash(DEMO_PASSWORD, 10);

  // ── Admin ──
  const admin = await prisma.user.upsert({
    where: { email: 'admin@motordesk.in' },
    update: { password, isActive: true },
    create: { name: 'Platform Admin', email: 'admin@motordesk.in', phone: '9000000001', password, role: 'ADMIN' },
  });

  // ── Vendors (shops) ──
  const vendorsData = [
    {
      name: 'Ravi Kumar', email: 'ravi@srautoparts.in', phone: '9000000002',
      shop: {
        shopName: 'Sri Ram Auto Parts', gstin: '29ABCDE1234F1Z5', addressLine: '12, JC Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560002',
        inventoryType: 'BOTH', status: 'APPROVED', upiId: 'sriramauto@okaxis', upiName: 'Sri Ram Auto Parts', upiNumber: '9000000002',
      },
    },
    {
      name: 'Imran Shaikh', email: 'imran@speedspares.in', phone: '9000000003',
      shop: {
        shopName: 'Speed Spares', gstin: '27ABCDE5678G1Z2', addressLine: '44, Bhavani Peth', city: 'Pune', state: 'Maharashtra', pincode: '411001',
        inventoryType: 'CAR', status: 'APPROVED', upiId: 'speedspares@ybl', upiName: 'Speed Spares', upiNumber: '9000000003',
      },
    },
    {
      name: 'Suresh Patel', email: 'suresh@bikezone.in', phone: '9000000004',
      shop: { shopName: 'Bike Zone Spares', addressLine: 'Relief Road', city: 'Ahmedabad', state: 'Gujarat', pincode: '380001', inventoryType: 'BIKE', status: 'PENDING' },
    },
  ];

  const vendors = [];
  for (const v of vendorsData) {
    const user = await prisma.user.upsert({
      where: { email: v.email },
      update: { password, isActive: true },
      create: { name: v.name, email: v.email, phone: v.phone, password, role: 'VENDOR', vendor: { create: { ...v.shop, phone: v.phone } } },
    });
    // Keep shop details (incl. UPI) in sync on every run — but never undo an admin's approve/reject
    const { status: _status, ...details } = v.shop;
    const vendor = await prisma.vendor.upsert({
      where: { userId: user.id },
      update: { ...details, phone: v.phone },
      create: { ...v.shop, phone: v.phone, userId: user.id },
    });
    vendors.push(vendor);
  }

  // ── Customer with two saved addresses (Home = default, Work) ──
  const addresses = [
    { id: 'seed-addr-home', label: 'Home', name: 'Anita Sharma', phone: '9000000005', line1: '221, MG Road, Ashok Nagar', landmark: 'Near Trinity Metro', city: 'Bengaluru', state: 'Karnataka', pincode: '560001', isDefault: true },
    { id: 'seed-addr-work', label: 'Work', name: 'Anita Sharma', phone: '9000000005', line1: '5th Floor, Prestige Tower, Residency Road', landmark: 'Opp. Mayo Hall', city: 'Bengaluru', state: 'Karnataka', pincode: '560025', isDefault: false },
  ];
  const customer = await prisma.user.upsert({
    where: { email: 'customer@motordesk.in' },
    update: { password, isActive: true },
    create: { name: 'Anita Sharma', email: 'customer@motordesk.in', phone: '9000000005', password, role: 'CUSTOMER', addresses },
  });
  if (!Array.isArray(customer.addresses) || customer.addresses.length === 0) {
    await prisma.user.update({ where: { id: customer.id }, data: { addresses } });
  }

  console.log(`  users: 1 admin, ${vendors.length} vendors, 1 customer (password ${DEMO_PASSWORD})`);
  return { admin, vendors, customer: { ...customer, addresses: customer.addresses?.length ? customer.addresses : addresses } };
}