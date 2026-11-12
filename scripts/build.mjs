import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeBrowserCatalog } from './build-catalog.mjs';
import { loadPortfolio, renderPortfolio } from '../shared/portfolio.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['home', 'about', 'series', 'shop', 'order', 'contacts', 'portfolio'];
const site = 'https://macherevictoria.artalbom-graf.com/';
const contactTargets = {
  instagram: 'https://www.instagram.com/macherevictoria',
  email: 'mailto:victtoress@gmail.com',
  tiktok: '',
  telegram: '',
  youtube: '',
  vk: ''
};
const artistStatementImage = {
  src: 'artist-statement-placeholder.png',
  width: 1122,
  height: 1402,
  isPlaceholder: true
};
const esc = (v) => String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const route = (lang, page) => page === 'home' ? lang + '/' : lang + '/' + page + '/';
const absolute = (lang, page) => site + route(lang, page);
function leafKeys(value, prefix = '', result = new Set()) {
  for (const [key, child] of Object.entries(value)) {
    const current = prefix ? prefix + '.' + key : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) leafKeys(child, current, result);
    else result.add(current);
  }
  return result;
}
function validateLocales(ru, en) {
  const ruKeys = leafKeys(ru);
  const enKeys = leafKeys(en);
  const missing = [...ruKeys].filter((key) => !enKeys.has(key)).concat([...enKeys].filter((key) => !ruKeys.has(key)));
  if (missing.length) throw new Error('Locale key parity failed: ' + missing.join(', '));
}

let pageTemplates = {};
let shellTemplate;
function render(template, context) {
 const rendered = template.replace(/\{\{([^{}]+)\}\}/g, (_, key) => {
  const value = key.trim().split('.').reduce((o,k)=>o?.[k], context);
  if (value === undefined) throw new Error('Missing template value: ' + key);
  return ['nav','dictionary','content','socialLinks','artistStatementMedia','portfolioMarkup','portfolioNotice','pageScripts','pageStyles'].includes(key.trim()) ? value : esc(value);
 });
 if (/\{\{[^{}]+\}\}/.test(rendered)) throw new Error('Unresolved template marker');
 return rendered;
}
const icons = {
  instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 3.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5Zm0 2A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5Zm5.2-3.2a1.15 1.15 0 1 1-1.15 1.15A1.15 1.15 0 0 1 17.2 6.3Z"/></svg>',
  email: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18v14H3V5Zm2 2v.7l7 4.8 7-4.8V7H5Zm14 10V10l-7 4.8L5 10v7h14Z"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3v11.1a4.8 4.8 0 1 1-4-4.73v2.08a2.8 2.8 0 1 0 2 2.68V3h2Zm2.2 0c.36 1.85 1.48 3.02 3.8 3.28v2.04A7.14 7.14 0 0 1 16.2 7v7.1H14V3h2.2Z"/></svg>',
  telegram: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 4-3 16-5.5-4-3.1 3 .4-4.3L17.7 7 7.9 13.2l-4.1-1.4L21 4Z"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 12c0 3.1-.36 5.03-.9 6.2-.3.66-.84 1.2-1.5 1.5C18.43 20.24 16.5 20.6 12 20.6s-6.43-.36-7.6-.9a3.2 3.2 0 0 1-1.5-1.5C2.36 17.03 2 15.1 2 12s.36-5.03.9-6.2c.3-.66.84-1.2 1.5-1.5C5.57 3.76 7.5 3.4 12 3.4s6.43.36 7.6.9c.66.3 1.2.84 1.5 1.5.54 1.17.9 3.1.9 6.2ZM10 8.6v6.8l5.7-3.4L10 8.6Z"/></svg>',
  vk: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h3.2c.2 5.1 2.4 7.3 4.1 7.8V6h3v4.5c1.7-.18 3.48-2.2 4.1-4.5h3c-.47 2.83-2.4 4.85-3.77 5.68 1.37.67 3.57 2.42 4.37 5.32h-3.3c-.68-2.2-2.3-3.84-4.4-4.07V17h-.36c-4.35 0-6.83-2.98-7.1-11Z"/></svg>'
};
function socialLinks(l) {
  return Object.entries(contactTargets).map(([name, href]) => {
    const platform = l.hero.social[name];
    const label = esc(href ? platform : l.hero.socialUnavailable.replace('{platform}', platform));
    const icon = icons[name];
    if (!href) return `<span class="hero-social-placeholder" role="img" aria-label="${label}">${icon}</span>`;
    const external = name === 'instagram' ? ' target="_blank" rel="noopener"' : '';
    return `<a class="hero-social-link" href="${esc(href)}" aria-label="${label}"${external}>${icon}</a>`;
  }).join('');
}
function artistStatementMedia(l, asset) {
  if (!artistStatementImage?.src) {
    return `<div class="statement-media statement-media--empty" role="img" aria-label="${esc(l.artistStatement.imageUnavailable)}"><span>${esc(l.artistStatement.imageUnavailable)}</span></div>`;
  }
  const { src, width, height, isPlaceholder } = artistStatementImage;
  const caption = isPlaceholder ? `<figcaption>${esc(l.artistStatement.imageCaption)}</figcaption>` : '';
  const alt = isPlaceholder ? l.artistStatement.imageAlt : l.artistStatement.photoAlt;
  return `<figure class="statement-media${isPlaceholder ? ' is-placeholder' : ''}"><img src="${asset}media/${esc(src)}" width="${Number(width)}" height="${Number(height)}" alt="${esc(alt)}" decoding="async">${caption}</figure>`;
}
function content(lang, page, l, asset, portfolio) {
 const portfolioMarkup = page === 'portfolio' ? renderPortfolio(portfolio, lang, asset, l.portfolio) : '';
 const portfolioNotice = page === 'portfolio' && portfolio.some((item) => item.isDemo) ? `<p class="bookshelf-notice">${esc(l.portfolio.demoNotice)}</p>` : '';
 return render(pageTemplates[page], {i18n:l, asset, portrait:lang==='en'?'main-portrait-eng.webp':'main-portrait-rus.webp', cv:'CV Victoria Golikova '+lang.toUpperCase()+'.pdf', socialLinks:socialLinks(l), artistStatementMedia:artistStatementMedia(l, asset), portfolioMarkup, portfolioNotice});
}

function document(lang, page, l, portfolio) {
  const nested = page !== 'home';
  const asset = nested ? '../../' : '../';
  const localeRoot = nested ? '../' : './';
  const other = lang === 'ru' ? 'en' : 'ru';
  const entries = [['about', l.nav.about], ['series', l.nav.series], ['shop', l.nav.shop], ['portfolio', l.nav.portfolio], ['contacts', l.nav.contacts]];
  const nav = entries.map(([id, label]) => '<a href="' + (page === 'home' ? id + '/' : '../' + id + '/') + '"' + (page === id ? ' aria-current="page"' : '') + '>' + esc(label) + '</a>').join('');
  const title = page === 'home' ? l.meta.title : (l.nav[page] || l.portfolio.title) + ' — ' + l.meta.title;
  const language = page === 'home' ? '../' + other + '/' : '../../' + other + '/' + page + '/';
  const pageScripts = page === 'portfolio' ? `<script src="${asset}js/portfolio.js" defer></script>` : '';
  const pageStyles = page === 'portfolio' ? `<link rel="stylesheet" href="${asset}css/portfolio.css">` : '';
  return render(shellTemplate, {lang,page,asset,localeRoot,title,nav,language,other,i18n:l,dictionary:JSON.stringify(l).replaceAll('<','\\u003C'),canonical:{current:absolute(lang,page),ru:absolute('ru',page),en:absolute('en',page),[lang]:absolute(lang,page)},content:content(lang,page,l,asset,portfolio),pageScripts,pageStyles});
}

const load = (lang) => readFile(resolve(root, 'src/locales', lang + '.json'), 'utf8').then(JSON.parse);
const main = async () => {
  await writeBrowserCatalog();
  const [ru, en, portfolio] = await Promise.all([load('ru'), load('en'), loadPortfolio()]);
  validateLocales(ru, en);
  shellTemplate = await readFile(resolve(root,'src/site.template.html'),'utf8');
  pageTemplates = Object.fromEntries(await Promise.all(pages.map(async page => [page, await readFile(resolve(root, 'src/pages', page+'.html'), 'utf8')])));
  for (const lang of ['ru', 'en']) for (const page of pages) {
    const target = resolve(root, route(lang, page), 'index.html');
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, document(lang, page, lang === 'ru' ? ru : en, portfolio), 'utf8');
  }
  await writeFile(resolve(root, 'index.html'), '<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Ma chere Victoria</title><link rel="canonical" href="' + site + '"></head><body><script>(()=>{let l="ru";try{l=localStorage.getItem("mcv-locale")||"ru"}catch(_){}l=l==="en"?"en":"ru";let m={"#manifesto":"series/","#shop":"shop/","#contacts":"contacts/"};let suffix=m[location.hash]||"";location.replace(l+"/"+suffix+location.search+(location.hash==="#about"?"#about":""))})()</script><p><a href="ru/">Русская версия</a> / <a href="en/">English version</a></p></body></html>', 'utf8');
  const notFound = { ru: ru.notFound, en: en.notFound };
  await writeFile(resolve(root, '404.html'), '<!doctype html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>404</title><link rel="stylesheet" href="/css/site.css"></head><body><main class="layout"><section class="page-section empty-state"><h1 id="title"></h1><p id="message"></p><p><a id="home"></a></p></section></main><script>const d=' + JSON.stringify(notFound).replaceAll('<', '\\u003C') + ';let l=new URLSearchParams(location.search).get("lang")||location.pathname.match(/\\/(ru|en)\\//)?.[1];if(l!=="en"&&l!=="ru"){try{l=localStorage.getItem("mcv-locale")}catch(_){}}l=l==="en"?"en":"ru";document.documentElement.lang=l;document.title=d[l].documentTitle;title.textContent=d[l].title;message.textContent=d[l].message;home.textContent=d[l].home;home.href="/"+l+"/";</script></body></html>', 'utf8');
  console.log('Built 14 localized pages and root router');
};
main().catch((error) => { console.error('Build failed: ' + error.message); process.exitCode = 1; });
