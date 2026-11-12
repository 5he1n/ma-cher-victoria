import { readFile } from 'node:fs/promises';

const supportedLocales = new Set(['ru', 'en']);
const supportedTypes = new Set(['film', 'theatre', 'literature']);
const idPattern = /^[a-z0-9][a-z0-9-]{0,63}$/;
const assetPattern = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;

const ui = {
  ru: {
    shelfLabel: 'Книжная полка проектов',
    close: 'Закрыть',
    demo: 'Демо',
    empty: 'Проекты скоро появятся.',
    types: { film: 'Фильм', theatre: 'Спектакль', literature: 'Книга' },
    open: 'Открыть проект'
  },
  en: {
    shelfLabel: 'Project bookshelf',
    close: 'Close',
    demo: 'Demo',
    empty: 'Projects are coming soon.',
    types: { film: 'Film', theatre: 'Theatre', literature: 'Book' },
    open: 'Open project'
  }
};

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

function assertLocalized(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${path} must be a localized object`);
  for (const locale of supportedLocales) {
    if (typeof value[locale] !== 'string' || !value[locale].trim()) throw new Error(`${path}.${locale} must be a non-empty string`);
  }
}

function assertOptionalLocalized(value, path) {
  if (value !== undefined) assertLocalized(value, path);
}

function assertImage(image, path) {
  if (!image || typeof image !== 'object' || Array.isArray(image)) throw new Error(`${path} must be an object`);
  if (typeof image.src !== 'string' || !assetPattern.test(image.src) || image.src.includes('..')) {
    throw new Error(`${path}.src must be a safe relative asset path`);
  }
  assertLocalized(image.alt, `${path}.alt`);
}

function assertExternalUrl(value, path) {
  if (typeof value !== 'string') throw new Error(`${path} must be a string`);
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${path} must be an absolute HTTP(S) URL`);
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error(`${path} must be an HTTP(S) URL`);
}

/** Validates portable portfolio content without mutating it. */
export function validatePortfolio(items) {
  if (!Array.isArray(items)) throw new Error('Portfolio data must be an array');
  const ids = new Set();
  items.forEach((item, index) => {
    const path = `portfolio[${index}]`;
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`${path} must be an object`);
    if (typeof item.id !== 'string' || !idPattern.test(item.id)) throw new Error(`${path}.id must be a safe unique identifier`);
    if (ids.has(item.id)) throw new Error(`${path}.id duplicates "${item.id}"`);
    ids.add(item.id);
    if (!supportedTypes.has(item.type)) throw new Error(`${path}.type must be one of: ${[...supportedTypes].join(', ')}`);
    if (typeof item.isDemo !== 'boolean') throw new Error(`${path}.isDemo must be a boolean`);
    assertLocalized(item.title, `${path}.title`);
    assertLocalized(item.description, `${path}.description`);
    assertOptionalLocalized(item.role, `${path}.role`);
    if (item.year !== undefined && !(typeof item.year === 'string' || Number.isInteger(item.year))) {
      throw new Error(`${path}.year must be a string or integer`);
    }
    if (item.image !== undefined) assertImage(item.image, `${path}.image`);
    if (item.url !== undefined) assertExternalUrl(item.url, `${path}.url`);
  });
  return items;
}

function assetUrl(assetRoot, src) {
  const root = typeof assetRoot === 'string' ? assetRoot : '';
  return `${root}${src}`;
}

function cover(item, labels, assetRoot) {
  const badge = item.isDemo ? `<span class="book-panel-demo">${escapeHtml(labels.demo)}</span>` : '';
  if (item.image) {
    return `<figure class="book-cover"><img src="${escapeHtml(assetUrl(assetRoot, item.image.src))}" alt="${escapeHtml(item.image.alt[labels.locale])}" loading="lazy">${badge}</figure>`;
  }
  return `<div class="book-cover book-cover--typographic" aria-hidden="true"><span class="book-cover-title">${escapeHtml(item.title[labels.locale])}</span><span class="book-cover-type">${escapeHtml(labels.types[item.type])}</span>${badge}</div>`;
}

/**
 * Renders accessible, useful no-JavaScript markup. Enhancement scripts may hide
 * panels and reveal the matching spine buttons after they initialise.
 */
export function renderPortfolio(items, locale, assetRoot = '', dictionary = {}) {
  validatePortfolio(items);
  if (!supportedLocales.has(locale)) throw new Error(`Unsupported portfolio locale: ${locale}`);
  const labels = {
    ...ui[locale],
    ...dictionary,
    types: { ...ui[locale].types, ...(dictionary.types || {}) },
    locale
  };
  if (!items.length) return `<p class="portfolio-empty" data-bookshelf-empty>${escapeHtml(labels.empty)}</p>`;

  const spines = items.map((item) => {
    const panelId = `book-panel-${item.id}`;
    const demo = item.isDemo ? `<span class="book-spine-demo">${escapeHtml(labels.demo)}</span>` : '';
    return `<button class="book-spine" type="button" data-book-trigger data-book-id="${escapeHtml(item.id)}" id="book-trigger-${escapeHtml(item.id)}" aria-expanded="false" aria-controls="${panelId}" hidden><span class="book-spine-label">${escapeHtml(item.title[locale])}</span><span class="book-spine-type">${escapeHtml(labels.types[item.type])}</span>${demo}<span class="visually-hidden">${escapeHtml(labels.open)}: ${escapeHtml(item.title[locale])}</span></button>`;
  }).join('');

  const panels = items.map((item) => {
    const panelId = `book-panel-${item.id}`;
    const meta = [
      item.year !== undefined ? `<p class="book-panel-year">${escapeHtml(item.year)}</p>` : '',
      item.role ? `<p class="book-panel-role">${escapeHtml(item.role[locale])}</p>` : '',
      item.url ? `<p class="book-panel-link"><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">${escapeHtml(item.url)}</a></p>` : ''
    ].join('');
    const demo = item.isDemo ? `<p class="book-panel-demo">${escapeHtml(labels.demo)}</p>` : '';
    return `<article class="book-panel" data-book-panel data-book-id="${escapeHtml(item.id)}" id="${panelId}" tabindex="-1" aria-labelledby="book-title-${escapeHtml(item.id)}"><button class="book-close" type="button" data-book-close hidden>${escapeHtml(labels.close)}</button><div class="book-panel-inner"><div class="book-panel-media">${cover(item, labels, assetRoot)}</div><div class="book-panel-content"><p class="book-panel-type">${escapeHtml(labels.types[item.type])}</p>${demo}<h2 id="book-title-${escapeHtml(item.id)}">${escapeHtml(item.title[locale])}</h2><p>${escapeHtml(item.description[locale])}</p>${meta}</div></div></article>`;
  }).join('');

  return `<section class="bookshelf" data-bookshelf><nav class="book-spines" data-book-spines aria-label="${escapeHtml(labels.shelfLabel)}">${spines}</nav><div class="book-panels" data-book-panels>${panels}</div></section>`;
}

export async function loadPortfolio(file = new URL('../src/data/portfolio.json', import.meta.url)) {
  const items = JSON.parse(await readFile(file, 'utf8'));
  return validatePortfolio(items);
}
