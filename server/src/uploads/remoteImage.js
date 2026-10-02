// server/src/uploads/remoteImage.js
// Downloads an image from a public link so we can keep our own copy in Cloudflare R2.
// Safety: only http/https on normal ports, never private/internal addresses (checked at connect time,
// so DNS tricks can't bypass it), max 5 MB, 10 s timeout, and the bytes must really be an image.
import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { ApiError } from '../utils/ApiError.js';

const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

/** Blocks loopback, private LAN, link-local, carrier-grade NAT, multicast and reserved ranges */
function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith('::ffff:')) return isPrivateIp(v6.slice(7)); // IPv4-mapped
  return v6 === '::' || v6 === '::1' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe8') ||
    v6.startsWith('fe9') || v6.startsWith('fea') || v6.startsWith('feb') || v6.startsWith('ff');
}

/** DNS lookup used by the socket itself — refuses to connect to internal addresses */
function safeLookup(hostname, options, callback) {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err);
    const list = Array.isArray(addresses) ? addresses : [{ address: addresses, family: options.family || 4 }];
    const bad = list.find((a) => isPrivateIp(a.address));
    if (bad) return callback(Object.assign(new Error('blocked-private-address'), { code: 'EBLOCKED' }));
    if (options.all) return callback(null, list);
    return callback(null, list[0].address, list[0].family);
  });
}

/** Detects the real image type from the first bytes (the server's Content-Type is often wrong) */
function sniffImageType(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (buf.length >= 12 && buf.toString('ascii', 4, 8) === 'ftyp' && ['avif', 'avis'].includes(buf.toString('ascii', 8, 12))) return 'image/avif';
  return null;
}

function checkUrl(raw) {
  let url;
  try { url = new URL(raw); } catch { throw ApiError.badRequest('That is not a valid link'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw ApiError.badRequest('Only http:// or https:// image links are supported');
  if (url.username || url.password) throw ApiError.badRequest('Links with a username or password are not allowed');
  if (url.port && !['80', '443'].includes(url.port)) throw ApiError.badRequest('Only links on the standard web ports are allowed');
  if (net.isIP(url.hostname.replace(/^\[|\]$/g, '')) && isPrivateIp(url.hostname.replace(/^\[|\]$/g, ''))) {
    throw ApiError.badRequest('That link points to a private network address');
  }
  return url;
}

function getOnce(url) {
  const lib = url.protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
    const req = lib.get(url, {
      lookup: safeLookup,
      timeout: TIMEOUT_MS,
      headers: { 'User-Agent': 'MotorDesk-ImageFetcher/1.0', Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8' },
    }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        return resolve({ redirect: new URL(res.headers.location, url).toString() });
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(ApiError.badRequest(`The image link returned an error (HTTP ${res.statusCode}). Check that it opens in your browser.`));
      }
      if (Number(res.headers['content-length']) > MAX_BYTES) {
        res.destroy();
        return reject(ApiError.badRequest('That image is larger than 5 MB'));
      }
      const chunks = [];
      let size = 0;
      res.on('data', (c) => {
        size += c.length;
        if (size > MAX_BYTES) { res.destroy(); reject(ApiError.badRequest('That image is larger than 5 MB')); }
        else chunks.push(c);
      });
      res.on('end', () => resolve({ buffer: Buffer.concat(chunks) }));
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' })));
    req.on('error', reject);
  });
}

/** Returns { buffer, mimetype } for a public image link, or throws a friendly 400 */
export async function downloadImage(rawUrl) {
  let url = checkUrl(rawUrl);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let result;
    try {
      result = await getOnce(url);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (err.code === 'EBLOCKED') throw ApiError.badRequest('That link points to a private network address');
      if (err.code === 'ETIMEDOUT') throw ApiError.badRequest('The image link took too long to respond');
      if (err.code === 'ENOTFOUND') throw ApiError.badRequest('That website could not be found — check the link');
      throw ApiError.badRequest(`Could not download the image (${err.code || err.message})`);
    }
    if (result.redirect) { url = checkUrl(result.redirect); continue; }

    const mimetype = sniffImageType(result.buffer);
    if (!mimetype) {
      throw ApiError.badRequest('That link is not a JPG, PNG, WEBP or AVIF image. Tip: right-click the picture → "Copy image address", not the page link.');
    }
    return { buffer: result.buffer, mimetype };
  }
  throw ApiError.badRequest('The image link redirects too many times');
}