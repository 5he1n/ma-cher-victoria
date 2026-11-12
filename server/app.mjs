import { randomUUID, createHash } from 'node:crypto';
import { loadCatalog, resolveOrderItems, toBrowserCatalog } from '../shared/catalog.mjs';

const RECIPIENT = 'victtoress@gmail.com';
const MAX_BODY_BYTES = 16 * 1024;
const TEN_MINUTES = 10 * 60 * 1000;
const json = (response, status, value) => { response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); response.end(JSON.stringify(value)); };

function readJson(request, limit = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    let size = 0; let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => { size += Buffer.byteLength(chunk); if (size > limit) { const error = new Error('Payload too large'); error.code = 'TOO_LARGE'; reject(error); } else body += chunk; });
    request.on('end', () => { try { resolve(JSON.parse(body)); } catch { reject(new Error('Invalid JSON')); } });
    request.on('error', reject);
  });
}
const containsLineBreak = (value) => /[\r\n]/.test(value);
function string(value, min, max, { lineBreaks = true } = {}) { if (typeof value !== 'string') return null; const trimmed = value.trim(); return trimmed.length < min || trimmed.length > max || (!lineBreaks && containsLineBreak(trimmed)) ? null : trimmed; }
function validateOrder(payload) {
  if (!payload || typeof payload !== 'object' || !['ru', 'en'].includes(payload.locale)) return null;
  if (typeof payload.catalogRevision !== 'string' || !/^[a-f0-9]{64}$/.test(payload.catalogRevision)) return null;
  if (typeof payload.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.requestId)) return null;
  if (!Array.isArray(payload.items) || payload.items.length < 1 || payload.items.length > 20) return null;
  const ids = new Set();
  if (!payload.items.every((entry) => entry && typeof entry.id === 'string' && /^[a-z0-9-]{1,80}$/i.test(entry.id) && !ids.has(entry.id) && (ids.add(entry.id), true))) return null;
  const name = string(payload.customer?.name, 1, 120, { lineBreaks: false });
  const email = string(payload.customer?.email, 3, 254, { lineBreaks: false });
  const phone = string(payload.customer?.phone ?? '', 0, 60, { lineBreaks: false });
  const comment = string(payload.customer?.comment ?? '', 0, 2000);
  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone === null || comment === null) return null;
  return { locale: payload.locale, catalogRevision: payload.catalogRevision, requestId: payload.requestId, items: payload.items, customer: { name, email, phone, comment } };
}

export function createMemoryRateLimiter({ limit = 5, windowMs = TEN_MINUTES } = {}) {
  const hits = new Map();
  return { consume(key, now = Date.now()) { for (const [ip, times] of hits) if (now-times.at(-1)>=windowMs) hits.delete(ip); const active = (hits.get(key) || []).filter((time) => now - time < windowMs); if (active.length >= limit) { hits.set(key, active); return false; } active.push(now); hits.set(key, active); return true; } };
}
function clientIp(request, trustProxy) { return trustProxy === true ? request.headers['x-forwarded-for']?.split(',')[0].trim() || request.socket.remoteAddress || 'unknown' : request.socket.remoteAddress || 'unknown'; }
function makeMessage(order, orderId) {
  const lines = order.items.map((item) => `- ${item.title}: ${item.price} ${item.currency}`).join('\n');
  const total = order.items.reduce((sum,item)=>sum+item.price,0);
  return { to: RECIPIENT, subject: `New order ${orderId}`, text: `Order: ${orderId}\nLocale: ${order.locale}\n\nItems:\n${lines}\nTotal: ${total} ${order.locale==='ru'?'RUB':'EUR'}\n\nCustomer:\n${order.customer.name}\n${order.customer.email}\n${order.customer.phone || '—'}\n\nComment:\n${order.customer.comment || '—'}`, replyTo: order.customer.email };
}

export function createOrderApp({ loadCatalogFn = loadCatalog, transport, siteOrigin, trustProxy = false, rateLimiter = createMemoryRateLimiter(), now = () => Date.now(), createId = randomUUID } = {}) {
  if (!transport || typeof transport.sendMail !== 'function') throw new Error('A mail transport is required');
  const idempotency = new Map();
  const cleanup = () => { const cutoff = now() - TEN_MINUTES; for (const [key, value] of idempotency) if (value.createdAt < cutoff) idempotency.delete(key); };
  return async function orderApp(request, response) {
    if (request.method !== 'POST' || new URL(request.url, 'http://localhost').pathname !== '/api/orders') return json(response, 404, { code: 'NOT_FOUND' });
    if (siteOrigin && request.headers.origin !== siteOrigin) return json(response, 403, { code: 'ORIGIN_FORBIDDEN' });
    if (!/^application\/json(?:\s*;|$)/i.test(String(request.headers['content-type']||''))) return json(response,415,{code:'INVALID_CONTENT_TYPE'});
    if (!rateLimiter.consume(clientIp(request, trustProxy), now())) return json(response, 429, { code: 'RATE_LIMITED' });
    let raw; try { raw = await readJson(request); } catch (error) { return json(response, error.code === 'TOO_LARGE' ? 413 : 400, { code: error.code === 'TOO_LARGE' ? 'PAYLOAD_TOO_LARGE' : 'INVALID_REQUEST' }); }
    if (raw?.website) return response.writeHead(204).end();
    const order = validateOrder(raw); if (!order) return json(response, 400, { code: 'INVALID_REQUEST' });
    cleanup(); const previous = idempotency.get(order.requestId);
    const fingerprint=createHash('sha256').update(JSON.stringify({...order,requestId:undefined})).digest('hex');
    if (previous) { if(previous.fingerprint!==fingerprint)return json(response,409,{code:'REQUEST_ID_REUSED'}); try { const completed = await previous.result; return json(response, completed.status, completed.body); } catch { return json(response, 503, { code: 'ORDER_UNAVAILABLE' }); } }
    const result = (async () => {
      const catalog = await loadCatalogFn(); const snapshot = toBrowserCatalog(catalog);
      if (catalog.revision !== order.catalogRevision) return { status: 409, body: { code: 'CATALOG_CHANGED', catalog: snapshot } };
      const resolved = resolveOrderItems(catalog, order.locale, order.items);
      if (resolved.error === 'INVALID_ITEM') return { status: 400, body: { code: 'INVALID_ITEM' } };
      if (resolved.error) return { status: 409, body: { code: resolved.error, catalog: snapshot } };
      const orderId = createId(); const info = await transport.sendMail(makeMessage({ ...order, items: resolved.items }, orderId));
      if (!Array.isArray(info?.accepted) || !info.accepted.includes(RECIPIENT) || (info.rejected?.length ?? 0) > 0) throw new Error('SMTP recipient rejected');
      return { status: 201, body: { orderId } };
    })();
    idempotency.set(order.requestId, { createdAt: now(), result, fingerprint });
    try { const completed = await result; return json(response, completed.status, completed.body); } catch { idempotency.delete(order.requestId); return json(response, 503, { code: 'ORDER_UNAVAILABLE' }); }
  };
}
