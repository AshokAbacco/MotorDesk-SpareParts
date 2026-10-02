// server/src/auth/auth.service.js
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { comparePassword, hashPassword } from '../utils/hash.js';
import { signToken } from '../utils/jwt.js';

const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  vendor: u.vendor
    ? {
        id: u.vendor.id,
        shopName: u.vendor.shopName,
        status: u.vendor.status,
        state: u.vendor.state,
        inventoryType: u.vendor.inventoryType, // CAR | BIKE | BOTH → decides the Car / Bike sidebar menus
      }
    : null,
});

export async function register(data) {
  const exists = await prisma.user.findFirst({
    where: { OR: [{ email: data.email }, ...(data.phone ? [{ phone: data.phone }] : [])] },
    select: { email: true },
  });
  if (exists) throw ApiError.conflict(exists.email === data.email ? 'Email already registered' : 'Phone already registered');

  const password = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      password,
      role: data.role,
      ...(data.role === 'VENDOR' && {
        vendor: {
          create: {
            shopName: data.shopName,
            gstin: data.gstin || null,
            phone: data.phone,
            city: data.city,
            state: data.state,
            pincode: data.pincode || null,
            addressLine: data.addressLine,
            inventoryType: data.inventoryType,
          },
        },
      }),
    },
    include: { vendor: true },
  });

  return { token: signToken({ sub: user.id, role: user.role }), user: publicUser(user) };
}

export async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email }, include: { vendor: true } });
  // Same message for both cases so emails can't be enumerated
  if (!user || !(await comparePassword(password, user.password))) throw ApiError.unauthorized('Invalid email or password');
  if (!user.isActive) throw ApiError.forbidden('Account disabled. Contact support.');

  return { token: signToken({ sub: user.id, role: user.role }), user: publicUser(user) };
}

export async function me(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { vendor: true } });
  if (!user) throw ApiError.notFound('User not found');
  return publicUser(user);
}