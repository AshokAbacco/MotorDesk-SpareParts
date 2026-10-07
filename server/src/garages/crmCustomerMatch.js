// server/src/garages/crmCustomerMatch.js
/**
 * Is an online-order customer a garage registered on the MotorDesk Garage CRM?
 *
 * Matched on BOTH identifiers we have for the customer:
 *   phone — the customer's account phone and the delivery phone (last 10 digits, so +91 / spaces don't matter)
 *   email — the customer's account email (case-insensitive)
 * A garage matching on phone and email is the strongest match; one matching on only one of them still counts,
 * and the result says which one matched so staff can judge.
 * Only garages the admin shows to shops are used (Admin → MotorDesk Garages).
 */
import { getVisibleCrmGarages } from './garageCrm.js';

const WAIT_MS = 4000; // never hold the orders page for a sleeping CRM — the next load uses the cache

const normPhone = (p) => {
  const d = String(p ?? '').replace(/\D/g, '');
  return d.length >= 10 ? d.slice(-10) : null;
};
const normEmail = (e) => (typeof e === 'string' && e.includes('@') ? e.trim().toLowerCase() : null);

function buildIndex(garages) {
  const byPhone = new Map();
  const byEmail = new Map();
  for (const g of garages) {
    const p = normPhone(g.phone);
    const e = normEmail(g.email);
    if (p && !byPhone.has(p)) byPhone.set(p, g);
    if (e && !byEmail.has(e)) byEmail.set(e, g);
  }
  return { byPhone, byEmail };
}

/** CRM garages, but give up after a few seconds (returns null) */
async function garagesQuickly() {
  const timeout = new Promise((resolve) => { setTimeout(() => resolve(null), WAIT_MS).unref?.(); });
  const res = await Promise.race([getVisibleCrmGarages().catch(() => null), timeout]);
  return res?.status?.connected ? res.garages : null;
}

function matchOne(index, order) {
  const phones = [order.customer?.phone, order.shippingAddress?.phone].map(normPhone).filter(Boolean);
  const email = normEmail(order.customer?.email);

  const phoneHit = phones.map((p) => index.byPhone.get(p)).find(Boolean) ?? null;
  const emailHit = email ? index.byEmail.get(email) ?? null : null;
  if (!phoneHit && !emailHit) return null;

  // Prefer the garage that matches on both; otherwise phone, then email
  const garage = phoneHit && emailHit && phoneHit.crmId === emailHit.crmId ? phoneHit : phoneHit ?? emailHit;
  const matchedBy = [
    ...(phoneHit?.crmId === garage.crmId ? ['PHONE'] : []),
    ...(emailHit?.crmId === garage.crmId ? ['EMAIL'] : []),
  ];
  return {
    crmId: garage.crmId,
    garageId: garage.id, // "md-<id>" — same id the Garages (B2B) page and POS use
    name: garage.name,
    ownerName: garage.ownerName,
    phone: garage.phone,
    email: garage.email,
    gstin: garage.gstin,
    address: garage.address,
    isVerified: garage.isVerified,
    matchedBy, // ['PHONE', 'EMAIL'] = both matched
  };
}

/**
 * Adds `crmMatch` (object or null) to each order. `crmChecked: false` means the CRM couldn't be reached in time,
 * so "no match" isn't certain yet.
 */
export async function attachCrmMatch(orders) {
  const list = [].concat(orders);
  const garages = await garagesQuickly();
  const index = garages ? buildIndex(garages) : null;
  const out = list.map((o) => ({ ...o, crmMatch: index ? matchOne(index, o) : null, crmChecked: Boolean(index) }));
  return Array.isArray(orders) ? out : out[0];
}