// ==========================================================================
// НАСТРОЙКИ
// ==========================================================================
const SHOP_EMAIL = 'example@mail.com';   // ← сюда приходят заказы
const CURRENCY = '€';

// ==========================================================================
// 1. УТИЛИТЫ
// ==========================================================================
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const money = (n) => `${Number(n).toLocaleString('ru-RU')} ${CURRENCY}`;
const num = (i) => String(i + 1).padStart(2, '0');
const caption = (o) => [o.year, o.material, o.size].filter(Boolean).join(' · ');

// ==========================================================================
// 2. ПОДГРУЗКА HTML-ЧАСТЕЙ
// ==========================================================================
async function loadParts() {
  const nodes = [...document.querySelectorAll('[data-include]')];
  if (!nodes.length) return;

  await Promise.all(nodes.map(async (el) => {
    try {
      const res = await fetch(el.dataset.include);
      if (!res.ok) throw new Error(res.status);
      el.outerHTML = await res.text();
    } catch (e) {
      console.error('Не загрузилась часть HTML:', el.dataset.include, e);
    }
  }));

  if (document.querySelector('[data-include]')) await loadParts();
}

// ==========================================================================
// 3. МЕНЮ
// ==========================================================================
function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.querySelector('.menu');
  if (!toggle || !menu) return;

  const setOpen = (open) => {
    menu.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  };

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  matchMedia('(min-width: 861px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });
}

function initScrollSpy() {
  const links = [...document.querySelectorAll('.menu a[href^="#"]')];
  const sections = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if (!sections.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });

  sections.forEach((s) => io.observe(s));
}

// ==========================================================================
// 4. КАРУСЕЛЬ «СЕРИЯ РАБОТ»
// ==========================================================================
const ARROW = {
  prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M15 4 7 12l8 8"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M9 4l8 8-8 8"/></svg>'
};

function workMarkup(item, i, eager) {
  const title = esc(item.title || 'Без названия');
  const note = esc(caption(item));
  return `
    <article class="work">
      <div class="work-media">
        <img src="${esc(item.image)}" alt="${title}" loading="${eager ? 'eager' : 'lazy'}" decoding="async">
      </div>
      <div class="work-meta">
        <div>
          <h3 class="work-title">${num(i)} — ${title}</h3>
          ${note ? `<span class="work-note">${note}</span>` : ''}
        </div>
      </div>
    </article>`;
}

function renderCarousel(root, items, label) {
  if (!root) return;

  if (!items?.length) {
    root.innerHTML = '<p class="state-empty">В этой категории пока пусто.</p>';
    return;
  }

  root.innerHTML = `
    <div class="carousel">
      <div class="carousel-track" role="region" aria-label="${esc(label)}" tabindex="0">
        ${items.map((it, i) => `<div class="carousel-slide">${workMarkup(it, i, i < 2)}</div>`).join('')}
      </div>
      <div class="carousel-controls">
        <button class="carousel-btn" data-dir="-1" aria-label="Предыдущая работа">${ARROW.prev}</button>
        <button class="carousel-btn" data-dir="1" aria-label="Следующая работа">${ARROW.next}</button>
        <span class="carousel-counter" aria-live="polite"></span>
        <span class="carousel-progress"><i></i></span>
      </div>
    </div>`;

  wireCarousel(root, items.length);
}

function wireCarousel(root, total) {
  const track = root.querySelector('.carousel-track');
  const buttons = root.querySelectorAll('.carousel-btn');
  const counter = root.querySelector('.carousel-counter');
  const bar = root.querySelector('.carousel-progress i');

  const step = () => {
    const slide = track.querySelector('.carousel-slide');
    if (!slide) return track.clientWidth;
    return slide.getBoundingClientRect().width + (parseFloat(getComputedStyle(track).columnGap) || 0);
  };

  buttons.forEach((btn) => btn.addEventListener('click', () => {
    track.scrollBy({ left: step() * Number(btn.dataset.dir), behavior: 'smooth' });
  }));

  track.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    track.scrollBy({ left: step() * (e.key === 'ArrowRight' ? 1 : -1), behavior: 'smooth' });
  });

  const update = () => {
    const max = track.scrollWidth - track.clientWidth;
    const visible = Math.max(1, Math.round(track.clientWidth / step()));
    const index = max > 0 ? Math.round(track.scrollLeft / step()) : 0;

    counter.textContent = `${num(Math.min(index, total - 1))} / ${num(total - 1)}`;

    const width = Math.min(100, (visible / total) * 100);
    const progress = max > 0 ? track.scrollLeft / max : 0;
    bar.style.width = width + '%';
    bar.style.transform = `translateX(${progress * (100 - width) / width * 100}%)`;

    buttons[0].disabled = track.scrollLeft <= 2;
    buttons[1].disabled = track.scrollLeft >= max - 2;
  };

  let ticking = false;
  track.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { update(); ticking = false; });
  }, { passive: true });

  new ResizeObserver(update).observe(track);
  update();
}

function collectItems(filter) {
  if (typeof gallery === 'undefined') return [];
  return filter === 'all' ? Object.values(gallery).flat() : (gallery[filter] || []);
}

function renderCatalog(filter = 'all') {
  renderCarousel(document.getElementById('catalogGrid'), collectItems(filter), 'Серия работ');
}

function initFilters(selector, onChange) {
  const tabs = [...document.querySelectorAll(selector)];
  if (!tabs.length) return;

  tabs.forEach((btn) => btn.addEventListener('click', () => {
    tabs.forEach((b) => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    onChange(btn.dataset.filter);
  }));
}

// ==========================================================================
// 5. СТЕНА (магазин)
// ==========================================================================
const shopItems = () => (typeof shop === 'undefined' ? [] : shop);
const findItem = (id) => shopItems().find((i) => String(i.id) === String(id));

// Пропорция работы. Нужна, чтобы пустое место от проданной картины
// имело ровно тот размер, который занимала сама картина.
const ratioOf = (item) => item.ratio || '4/5';

function hangMarkup(item, i) {
  const sold = item.status === 'sold';
  const title = esc(item.title || 'Без названия');
  const meta = esc([item.type, item.size].filter(Boolean).join(' · '));
  const scale = item.scale === 's' || item.scale === 'l' ? ` is-${item.scale}` : '';

  const body = sold
    ? `<div class="hang-ghost" style="aspect-ratio:${esc(ratioOf(item))}" aria-hidden="true"></div>`
    : `<div class="hang-media" style="aspect-ratio:${esc(ratioOf(item))}">
         <img src="${esc(item.image)}" alt="${title}" loading="${i < 4 ? 'eager' : 'lazy'}" decoding="async">
       </div>`;

  const label = `
    <div class="hang-label">
      <span class="hang-index">№${num(i)}</span>
      <span class="hang-title">${title}
        ${meta ? `<span class="hang-meta">${meta}</span>` : ''}
        ${sold && item.collection ? `<span class="hang-collection">${esc(item.collection)}</span>` : ''}
      </span>
      <span class="hang-price">${sold ? 'Продано' : money(item.price)}</span>
    </div>`;

  // Проданная работа тоже кликабельна: у неё есть своя история
  return `
    <article class="hang${scale}">
      <span class="hang-nail" aria-hidden="true"></span>
      <button class="hang-frame" data-open="${esc(item.id)}"
              aria-label="${title} — подробнее">
        ${body}
        ${label}
      </button>
    </article>`;
}

function renderShop(filter = 'all') {
  const wall = document.getElementById('shopWall');
  if (!wall) return;

  const items = shopItems().filter((it) => filter === 'all' || it.kind === filter);

  wall.innerHTML = items.length
    ? items.map(hangMarkup).join('')
    : '<p class="state-empty">В этой категории пока пусто.</p>';
}

// ==========================================================================
// 6. РАЗВОРОТ РАБОТЫ
// ==========================================================================
function specRow(name, value) {
  return value ? `<div><span>${esc(name)}</span><span>${esc(value)}</span></div>` : '';
}

function openSpread(id) {
  const item = findItem(id);
  const spread = document.getElementById('spread');
  if (!item || !spread) return;

  const index = shopItems().indexOf(item);
  const sold = item.status === 'sold';

  spread.querySelector('.spread-inner').innerHTML = `
    <div class="spread-main">
      <img src="${esc(item.image)}" alt="${esc(item.title)}">
    </div>

    <div class="spread-side">
      <span class="spread-index">№${num(index)} ${sold ? '— продано' : ''}</span>
      <h2 class="spread-title">${esc(item.title)}</h2>

      ${item.detail ? `
        <div class="spread-detail"><img src="${esc(item.detail)}" alt="Фрагмент работы"></div>
        <p class="spread-detail-note">Фрагмент</p>` : ''}

      ${item.about ? `<p class="spread-about">${esc(item.about)}</p>` : ''}

      <div class="spread-specs">
        ${specRow('Год', item.year)}
        ${specRow('Материал', item.material)}
        ${specRow('Размер', item.size)}
        ${specRow('Тип', item.type)}
        ${specRow('Цена', sold ? '—' : money(item.price))}
      </div>

      ${sold
        ? `<p class="spread-sold">${esc(item.collection || 'Работа продана')}</p>`
        : `<div class="spread-buy">
             <button class="btn" data-add="${esc(item.id)}">В корзину — ${money(item.price)}</button>
           </div>`}
    </div>`;

  spread.classList.add('is-open');
  spread.setAttribute('aria-hidden', 'false');
  document.body.classList.add('is-locked');
  spread.querySelector('.spread-close').focus();
}

function closeSpread() {
  const spread = document.getElementById('spread');
  if (!spread) return;
  spread.classList.remove('is-open');
  spread.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('is-locked');
}

// ==========================================================================
// 7. КОРЗИНА
// ==========================================================================
const cart = {
  items: [],

  add(id) {
    const product = findItem(id);
    if (!product || product.status === 'sold') return false;
    if (this.items.some((i) => i.id === product.id)) return false;  // оригинал один
    this.items.push(product);
    this.render();
    return true;
  },

  remove(id) {
    this.items = this.items.filter((i) => String(i.id) !== String(id));
    this.render();
  },

  total() { return this.items.reduce((s, i) => s + Number(i.price || 0), 0); },

  render() {
    const body = document.getElementById('cartBody');
    if (!body) return;

    body.innerHTML = this.items.length
      ? this.items.map((i) => `
          <div class="cart-item">
            <img src="${esc(i.image)}" alt="">
            <div>
              <h4>${esc(i.title)}</h4>
              <span class="cart-item-note">${esc([i.type, i.size].filter(Boolean).join(' · '))}</span>
              <button class="cart-remove" data-remove="${esc(i.id)}">Убрать</button>
            </div>
            <span class="cart-item-price">${money(i.price)}</span>
          </div>`).join('')
      : '<p class="cart-empty">Пока пусто. Выберите работу на стене.</p>';

    document.getElementById('cartTotal').textContent = money(this.total());
    document.getElementById('cartCount').textContent = this.items.length ? `(${this.items.length})` : '';

    const order = document.getElementById('cartOrder');
    order.classList.toggle('is-disabled', !this.items.length);
    order.setAttribute('aria-disabled', String(!this.items.length));
    order.href = this.items.length ? this.mailto() : '#';
  },

  // Бэкенда у статического хостинга нет — заказ уходит письмом
  mailto() {
    const lines = this.items.map((i) =>
      `— ${i.title} (${[i.type, i.size].filter(Boolean).join(', ')}) — ${money(i.price)}`);

    const body = [
      'Здравствуйте! Хочу оформить заказ:', '',
      ...lines, '',
      `Итого: ${money(this.total())}`, '',
      'Имя:', 'Адрес доставки:', 'Телефон:'
    ].join('\n');

    return `mailto:${SHOP_EMAIL}?subject=${encodeURIComponent('Заказ — Ma chere Victoria')}&body=${encodeURIComponent(body)}`;
  }
};

function initCart() {
  const panel = document.getElementById('cartPanel');
  const overlay = document.getElementById('cartOverlay');
  const toggle = document.getElementById('cartToggle');
  if (!panel || !toggle) return;

  const setOpen = (open) => {
    panel.classList.toggle('is-open', open);
    overlay.classList.toggle('is-open', open);
    panel.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('is-locked', open);
  };

  toggle.addEventListener('click', () => setOpen(true));
  overlay.addEventListener('click', () => setOpen(false));
  panel.querySelector('.cart-close').addEventListener('click', () => setOpen(false));

  toggle.hidden = false;
  cart.render();
  return setOpen;
}

// ==========================================================================
// 8. ОБЩЕЕ ДЕЛЕГИРОВАНИЕ КЛИКОВ
// ==========================================================================
// Карточки перерисовываются при смене фильтра, поэтому слушаем документ
function initDelegation() {
  document.addEventListener('click', (e) => {
    const open = e.target.closest('[data-open]');
    if (open) { openSpread(open.dataset.open); return; }

    if (e.target.closest('.spread-close')) { closeSpread(); return; }

    const add = e.target.closest('[data-add]');
    if (add) {
      const ok = cart.add(add.dataset.add);
      const original = add.textContent;
      add.textContent = ok ? 'Добавлено в корзину' : 'Уже в корзине';
      add.classList.add('btn-added');
      setTimeout(() => { add.textContent = original; add.classList.remove('btn-added'); }, 1800);
      return;
    }

    const rm = e.target.closest('[data-remove]');
    if (rm) cart.remove(rm.dataset.remove);
  });

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSpread(); });
}

// ==========================================================================
// 9. ЗАПУСК
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  await loadParts();
  initNav();

  renderCatalog('all');
  initFilters('#catalogFilters .tab-btn', renderCatalog);

  renderShop('all');
  initFilters('#shopFilters .tab-btn', renderShop);

  initCart();
  initDelegation();
  initScrollSpy();
});