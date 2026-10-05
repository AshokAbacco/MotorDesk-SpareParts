// server/src/garages/garageCrm.js
/**
 * Read-only client for the MotorDesk Garage CRM (auto-garage-crm).
 *
 * Garages register in the CRM; this app never copies them into its own database.
 * We call the CRM's existing partner endpoint
 *     GET {GARAGE_CRM_API_URL}/api/v1/external/users?page=&limit=   (header x-api-key)
 * and keep the result in memory for a few minutes, so the Garages page and POS stay fast
 * and the CRM isn't asked on every click.
 */
import { env, isGarageCrmConfigured } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const PAGE_SIZE = 100;          // the CRM caps a page at 100
const MAX_PAGES = 30;           // safety cap: 3,000 garages
const TIMEOUT_MS = 60_000;      // a sleeping Render server needs ~30–60s to wake up
const ID_PREFIX = 'md-';        // MotorDesk garage ids in this app: "md-<crm user id>"

// Indian states / UTs, to work out the place of supply (GST) from the CRM address text
const STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
].sort((a, b) => b.length - a.length); // longest first, so "Andhra Pradesh" wins over "Pradesh"-like partials

// First two digits of a GSTIN = state code (more reliable than the address when present)
const GST_STATE_CODES = {
  '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana',
  '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh', 10: 'Bihar', 11: 'Sikkim', 12: 'Arunachal Pradesh', 13: 'Nagaland',
  14: 'Manipur', 15: 'Mizoram', 16: 'Tripura', 17: 'Meghalaya', 18: 'Assam', 19: 'West Bengal', 20: 'Jharkhand', 21: 'Odisha',
  22: 'Chhattisgarh', 23: 'Madhya Pradesh', 24: 'Gujarat', 26: 'Dadra and Nagar Haveli and Daman and Diu', 27: 'Maharashtra',
  29: 'Karnataka', 30: 'Goa', 31: 'Lakshadweep', 32: 'Kerala', 33: 'Tamil Nadu', 34: 'Puducherry', 35: 'Andaman and Nicobar Islands',
  36: 'Telangana', 37: 'Andhra Pradesh', 38: 'Ladakh',
};

function stateOf(gstin, address) {
  const byGst = gstin && /^\d{2}[A-Z0-9]{13}$/i.test(gstin) ? GST_STATE_CODES[gstin.slice(0, 2)] : null;
  if (byGst) return byGst;
  const text = (address || '').toLowerCase();
  return STATES.find((s) => text.includes(s.toLowerCase())) ?? null;
}

/** CRM user (garage owner account) → the garage shape used across this app */
function toGarage(u) {
  const gstin = u.gstNumber?.trim().toUpperCase() || null;
  const address = u.companyAddress?.trim() || u.address?.trim() || null;
  return {
    id: `${ID_PREFIX}${u.id}`,
    crmId: u.id,
    source: 'MOTORDESK',
    name: u.companyName?.trim() || u.username?.trim() || u.email,
    ownerName: u.username?.trim() || null,
    phone: u.phone?.trim() || null,
    email: u.email || null,
    gstin,
    address,
    state: stateOf(gstin, address),
    isVerified: Boolean(u.isVerified),
    services: (u.services ?? []).map((s) => s.name).filter(Boolean),
    registeredAt: u.createdAt ?? null,
  };
}

// Only garage owners who can trade (not suspended, not CRM admins)
const isListable = (u) => !u.isSuspended && !/admin/i.test(u.role ?? '');

let cache = { garages: null, fetchedAt: 0, error: null };
let inFlight = null;

async function fetchPage(page) {
  const url = new URL('/api/v1/external/users', env.GARAGE_CRM_API_URL);
  url.searchParams.set('page', page);
  url.searchParams.set('limit', PAGE_SIZE);
  const res = await fetch(url, { headers: { 'x-api-key': env.GARAGE_CRM_API_KEY, Accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (res.status === 401 || res.status === 403) throw new Error('Garage CRM rejected the API key — GARAGE_CRM_API_KEY must equal EXTERNAL_API_KEY on the CRM server');
  if (!res.ok) throw new Error(`Garage CRM answered ${res.status}`);
  const body = await res.json();
  if (!body?.success || !Array.isArray(body.data)) throw new Error('Garage CRM sent an unexpected response');
  return body;
}

async function fetchAll() {
  const first = await fetchPage(1);
  const pages = Math.min(first.meta?.totalPages ?? 1, MAX_PAGES);
  const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => fetchPage(i + 2)));
  const users = [first, ...rest].flatMap((b) => b.data);
  const seen = new Set();
  return users
    .filter((u) => isListable(u) && !seen.has(u.id) && seen.add(u.id))
    .map(toGarage)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * All MotorDesk garages (cached). Never throws: when the CRM is down the last good list is served,
 * and `status` says what happened so the page can show a notice.
 * @returns {{ garages: object[], status: { connected: boolean, ok: boolean, stale?: boolean, message?: string, fetchedAt?: Date } }}
 */
export async function getCrmGarages({ force = false } = {}) {
  if (!isGarageCrmConfigured) {
    return { garages: [], status: { connected: false, ok: false, message: 'MotorDesk Garage CRM is not connected (set GARAGE_CRM_API_URL and GARAGE_CRM_API_KEY in server .env)' } };
  }
  const fresh = cache.garages && Date.now() - cache.fetchedAt < env.GARAGE_CRM_CACHE_MINUTES * 60_000;
  if (!fresh || force) {
    inFlight ??= fetchAll()
      .then((garages) => { cache = { garages, fetchedAt: Date.now(), error: null }; })
      .catch((err) => {
        console.error('Garage CRM fetch failed:', err.message);
        cache = { ...cache, error: err.name === 'TimeoutError' ? 'Garage CRM did not answer in time (it may be waking up)' : err.message };
      })
      .finally(() => { inFlight = null; });
    await inFlight;
  }
  const status = {
    connected: true,
    ok: Boolean(cache.garages) && !cache.error,
    ...(cache.fetchedAt && { fetchedAt: new Date(cache.fetchedAt) }),
    ...(cache.error && { message: cache.error, stale: Boolean(cache.garages) }),
  };
  return { garages: cache.garages ?? [], status };
}

/** Cached list only — never waits for the CRM (used for tab counts on the "Own garages" tab) */
export const peekCrmGarages = () => cache.garages;

export const isCrmGarageId = (id) => typeof id === 'string' && id.startsWith(ID_PREFIX);
export const crmIdOf = (id) => Number(id.slice(ID_PREFIX.length));
export const crmGarageKey = (crmId) => `${ID_PREFIX}${crmId}`;

/** One MotorDesk garage by its app id ("md-12") — used when billing it at POS */
export async function getCrmGarage(id) {
  const crmId = crmIdOf(id);
  let { garages } = await getCrmGarages();
  let garage = garages.find((g) => g.crmId === crmId);
  if (!garage) ({ garages } = await getCrmGarages({ force: true })); // maybe registered in the last few minutes
  garage ??= garages.find((g) => g.crmId === crmId);
  if (!garage) throw ApiError.notFound('MotorDesk garage not found (it may have been removed from the Garage CRM)');
  return garage;
}