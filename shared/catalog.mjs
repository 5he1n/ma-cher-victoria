import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export const defaultCatalogPath = new URL('../catalog/works.json', import.meta.url);
const clone = (value) => JSON.parse(JSON.stringify(value));

function validateCatalog(source) {
  if (!source || !Array.isArray(source.items) || !source.images || typeof source.images !== 'object') throw new Error('Invalid catalog source');
  const ids = new Set();
  for (const item of source.items) {
    if (!item || typeof item.id !== 'string' || !item.id || ids.has(item.id)) throw new Error('Catalog contains an invalid or duplicate item id');
    ids.add(item.id);
    if (item.status !== 'sold' && (!item.price || !Number.isFinite(item.price.ru) || !Number.isFinite(item.price.en) || item.price.ru < 0 || item.price.en < 0)) throw new Error(`Catalog item ${item.id} has no canonical price`);
  }
}

/** Loads the versioned source catalogue. This is the single adapter Dev 5 can replace. */
export async function loadCatalog(path = defaultCatalogPath) {
  const raw = await readFile(path);
  const parsed = JSON.parse(raw.toString('utf8'));
  validateCatalog(parsed);
  return { items: clone(parsed.items), images: clone(parsed.images), revision: createHash('sha256').update(raw).digest('hex') };
}

export function toBrowserCatalog(catalog) { return { items: clone(catalog.items), images: clone(catalog.images), revision: catalog.revision }; }
export function catalogForLocale(catalog, locale) { return catalog.items.map((item) => ({ ...clone(item), canonicalPrice: item.price?.[locale], currency: locale === 'ru' ? 'RUB' : 'EUR' })); }
export function resolveOrderItems(catalog, locale, requestedItems) {
  const byId = new Map(catalog.items.map((item) => [item.id, item]));
  const resolved = [];
  for (const requested of requestedItems) {
    const item = byId.get(requested.id);
    if (!item) return { error: 'INVALID_ITEM' };
    if (item.status === 'sold') return { error: 'ITEM_UNAVAILABLE' };
    resolved.push({ id: item.id, title: item.title?.[locale] || item.title?.ru || item.id, price: item.price[locale], currency: locale === 'ru' ? 'RUB' : 'EUR' });
  }
  return { items: resolved };
}
