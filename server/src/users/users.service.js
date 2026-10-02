// server/src/users/users.service.js
import { randomUUID } from 'node:crypto';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { comparePassword, hashPassword } from '../utils/hash.js';
import { toNum } from '../utils/money.js';

const MAX_ADDRESSES = 10;
const select = { id: true, name: true, email: true, phone: true, role: true, addresses: true, createdAt: true };

// ─────────────── profile ───────────────

export async function getMe(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select });
  if (!user) throw ApiError.notFound('User not found');
  user.addresses = await loadAddresses(userId, user.addresses);

  if (user.role === 'CUSTOMER') {
    const where = { customerId: userId, status: { notIn: ['AWAITING_PAYMENT', 'CANCELLED'] } };
    const [orders, spent, delivered] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.aggregate({ where, _sum: { grandTotal: true } }),
      prisma.order.count({ where: { customerId: userId, status: 'DELIVERED' } }),
    ]);
    user.stats = { orders, delivered, totalSpent: toNum(spent._sum.grandTotal) };
  }
  return user;
}

export async function updateMe(userId, { name, phone }) {
  if (phone) {
    const taken = await prisma.user.findFirst({ where: { phone, id: { not: userId } }, select: { id: true } });
    if (taken) throw ApiError.conflict('This mobile number is already used by another account');
  }
  await prisma.user.update({
    where: { id: userId },
    data: { ...(name && { name }), ...(phone !== undefined && { phone: phone || null }) },
  });
  return getMe(userId);
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!(await comparePassword(currentPassword, user.password))) throw ApiError.badRequest('Current password is incorrect');
  if (currentPassword === newPassword) throw ApiError.badRequest('New password must be different from the current one');
  await prisma.user.update({ where: { id: userId }, data: { password: await hashPassword(newPassword) } });
}

// ─────────────── address book (stored as JSON on the user) ───────────────

/** Gives every address an id and makes sure exactly one is the default */
function normalize(list) {
  const out = (Array.isArray(list) ? list : []).map((a) => ({ ...a, id: a.id ?? randomUUID(), label: a.label || 'Home', isDefault: Boolean(a.isDefault) }));
  if (out.length && !out.some((a) => a.isDefault)) out[0].isDefault = true;
  let seen = false;
  for (const a of out) { if (a.isDefault && seen) a.isDefault = false; if (a.isDefault) seen = true; }
  // default first, then in the order they were added
  return [...out.filter((a) => a.isDefault), ...out.filter((a) => !a.isDefault)];
}

async function loadAddresses(userId, raw) {
  const stored = raw ?? (await prisma.user.findUnique({ where: { id: userId }, select: { addresses: true } }))?.addresses;
  const list = normalize(stored);
  // Older addresses were saved without ids — persist the upgrade once
  if (JSON.stringify(list) !== JSON.stringify(stored ?? [])) await save(userId, list);
  return list;
}

const save = (userId, list) => prisma.user.update({ where: { id: userId }, data: { addresses: list } });

export const listAddresses = (userId) => loadAddresses(userId);

export async function addAddress(userId, data) {
  const list = await loadAddresses(userId);
  if (list.length >= MAX_ADDRESSES) throw ApiError.badRequest(`You can save up to ${MAX_ADDRESSES} addresses. Delete one to add another.`);
  const address = { ...data, landmark: data.landmark || undefined, id: randomUUID(), isDefault: Boolean(data.isDefault) || list.length === 0 };
  const next = normalize([...(address.isDefault ? list.map((a) => ({ ...a, isDefault: false })) : list), address]);
  await save(userId, next);
  return { address: next.find((a) => a.id === address.id), addresses: next };
}

export async function updateAddress(userId, id, data) {
  const list = await loadAddresses(userId);
  const current = list.find((a) => a.id === id);
  if (!current) throw ApiError.notFound('Address not found');
  const updated = { ...current, ...data, landmark: data.landmark || undefined, id, isDefault: data.isDefault ?? current.isDefault };
  const next = normalize(list.map((a) => (a.id === id ? updated : updated.isDefault ? { ...a, isDefault: false } : a)));
  await save(userId, next);
  return { address: next.find((a) => a.id === id), addresses: next };
}

export async function deleteAddress(userId, id) {
  const list = await loadAddresses(userId);
  if (!list.some((a) => a.id === id)) throw ApiError.notFound('Address not found');
  const next = normalize(list.filter((a) => a.id !== id)); // if the default was removed, the next one becomes default
  await save(userId, next);
  return next;
}

export async function setDefaultAddress(userId, id) {
  const list = await loadAddresses(userId);
  if (!list.some((a) => a.id === id)) throw ApiError.notFound('Address not found');
  const next = normalize(list.map((a) => ({ ...a, isDefault: a.id === id })));
  await save(userId, next);
  return next;
}