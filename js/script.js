// ==========================================================================
// НАСТРОЙКИ
// ==========================================================================
const SHOP_EMAIL = 'victtoress@gmail.com';   // ← сюда приходят заказы
const CART_KEY = 'mcv-cart';             // ключ хранения корзины
const CART_BADGE_POSITION = 'top-right';  // 'top-right' | 'bottom-right'
const i18n = window.mcvI18n || {
  t: (path) => path,
  value: (entry) => (entry && typeof entry === 'object' ? (entry.ru ?? entry.en ?? '') : (entry ?? '')),
  amount: (entry) => {
    const localized = entry && typeof entry === 'object' ? (entry.ru ?? entry.en ?? 0) : entry;
    const number = Number(localized || 0);
    return Number.isFinite(number) ? number : 0;
  },
  money: (entry) => {
    const locale = document.documentElement.lang === 'en' ? 'en' : 'ru';
    const number = entry && typeof entry === 'object' ? (entry[locale] ?? entry.ru ?? entry.en ?? 0) : entry;
    return `${Number(number || 0).toLocaleString(locale === 'en' ? 'en-US' : 'ru-RU')} ${locale === 'en' ? '€' : '₽'}`;
  }
};
const t = (path, replacements) => i18n.t(path, replacements);
const value = (entry) => i18n.value(entry);

// ==========================================================================
// 1. УТИЛИТЫ
// ==========================================================================
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const money = (n) => i18n.money(n);
const amount = (n) => i18n.amount(n);
const moneyMarkup = (n) => {
  const formatted = money(n);
  const currency = formatted.match(/[₽€]$/)?.[0];
  if (!currency) return esc(formatted);
  return `${esc(formatted.slice(0, -1))}<span class="currency-symbol">${currency}</span>`;
};
const num = (i) => String(i + 1).padStart(2, '0');
const caption = (o) => [value(o.year), value(o.material), value(o.size)].filter(Boolean).join(' · ');

const localized = (item, field, fallback = '') => {
  const result = value(item?.[field]);
  return result || fallback;
};

/**
 * Тег картинки с адаптивными срезами.
 * Метаданные full/small-версий заданы в IMAGE_META.
 * Без метаданных размер берём из указанного ratio.
 */
function imgTag(src, alt, {
  sizes,
  loading = 'lazy',
  fetchPriority = 'auto',
  ratio = '4/5',
  thumbnail = false
} = {}) {
  const meta = typeof IMAGE_META === 'undefined' ? null : IMAGE_META[src];
  const [w, h] = ratio.split('/').map(Number);
  const primary = thumbnail && meta?.small
    ? meta.small
    : { src, width: meta?.width || w * 100, height: meta?.height || h * 100 };
  const srcset = !thumbnail && meta?.small && sizes
    ? `${meta.small.src} ${meta.small.width}w, ${src} ${meta.width}w`
    : '';

  return `<img src="${esc(primary.src)}"
    ${srcset ? `srcset="${esc(srcset)}" sizes="${esc(sizes)}"` : ''}
    alt="${esc(alt)}"
    width="${primary.width}" height="${primary.height}"
    loading="${esc(loading)}" decoding="async" fetchpriority="${esc(fetchPriority)}">`;
}

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
    toggle.setAttribute('aria-label', open ? t('access.closeMenu') : t('access.openMenu'));
  };

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  matchMedia('(min-width: 861px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });

  return setOpen;
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
// 4. ГРАНИЦЫ СЕРИЙ
// ==========================================================================
function initSeriesBounds() {
  const mobileView = window.matchMedia('(max-width: 1100px)');

  const layoutLeftWithin = (element, ancestor) => {
    let left = 0;
    let current = element;

    while (current && current !== ancestor) {
      left += current.offsetLeft;
      current = current.offsetParent;
    }

    return current === ancestor ? left : null;
  };

  document.querySelectorAll('.manifesto .series').forEach((series) => {
    const manifesto = series.closest('.manifesto');
    const stage = series.querySelector('.series-stage');
    const pieces = [...series.querySelectorAll('.series-piece')];
    if (!manifesto || !stage || !pieces.length) return;

    let frame = 0;
    let observing = false;

    const clear = () => {
      series.classList.remove('has-measured-pieces');
      series.style.removeProperty('--series-pieces-left');
      series.style.removeProperty('--series-pieces-width');
    };

    const update = () => {
      frame = 0;
      if (!mobileView.matches) {
        clear();
        return;
      }

      const stageLeft = layoutLeftWithin(stage, manifesto);
      const pieceBounds = pieces.map((piece) => {
        const left = layoutLeftWithin(piece, stage);
        return left === null ? null : { left, right: left + piece.offsetWidth };
      }).filter(Boolean);
      if (stageLeft === null || !pieceBounds.length) return;

      const stackLeft = Math.min(...pieceBounds.map((piece) => piece.left));
      const stackRight = Math.max(...pieceBounds.map((piece) => piece.right));
      const visibleLeft = -stageLeft;
      const visibleRight = manifesto.clientWidth - stageLeft;
      const left = Math.max(stackLeft, visibleLeft);
      const right = Math.min(stackRight, visibleRight);
      const width = right - left;
      if (!Number.isFinite(left) || !Number.isFinite(width) || width <= 0) return;

      series.style.setProperty('--series-pieces-left', `${left}px`);
      series.style.setProperty('--series-pieces-width', `${width}px`);
      series.classList.add('has-measured-pieces');
    };
    const scheduleUpdate = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    const observer = new ResizeObserver(scheduleUpdate);
    const toggle = () => {
      if (mobileView.matches) {
        if (!observing) {
          observer.observe(manifesto);
          observer.observe(stage);
          pieces.forEach((piece) => observer.observe(piece));
          observing = true;
        }
        scheduleUpdate();
      } else {
        observer.disconnect();
        observing = false;
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        clear();
      }
    };

    pieces.forEach((piece) => {
      if (!piece.complete) piece.addEventListener('load', scheduleUpdate, { once: true });
      if (typeof piece.decode === 'function') {
        piece.decode().then(scheduleUpdate).catch(() => {});
      }
    });

    if (typeof mobileView.addEventListener === 'function') {
      mobileView.addEventListener('change', toggle);
    } else {
      mobileView.addListener(toggle);
    }
    toggle();
  });
}

// ==========================================================================
// 5. КАРУСЕЛЬ «СЕРИЯ РАБОТ»
// ==========================================================================
const ARROW = {
  prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M15 4 7 12l8 8"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M9 4l8 8-8 8"/></svg>'
};

const CAROUSEL_SIZES = '(max-width: 700px) 82vw, (max-width: 1100px) 45vw, 30vw';

function workMarkup(item, i) {
  const title = localized(item, 'title', t('messages.untitled'));
  const note = esc(caption(item));

  return `
    <article class="work">
      <div class="work-media">
        ${imgTag(item.image, title, { sizes: CAROUSEL_SIZES })}
      </div>
      <div class="work-meta">
        <div>
          <h3 class="work-title">${num(i)} — ${esc(title)}</h3>
          ${note ? `<span class="work-note">${note}</span>` : ''}
        </div>
      </div>
    </article>`;
}

function renderCarousel(root, items, label) {
  if (!root) return;

  if (!items?.length) {
    root.innerHTML = `<p class="state-empty">${esc(t('catalog.empty'))}</p>`;
    return;
  }

  root.innerHTML = `
    <div class="carousel">
      <div class="carousel-track" role="region" aria-label="${esc(t('catalog.aria'))}" tabindex="0">
        ${items.map((it, i) => `<div class="carousel-slide">${workMarkup(it, i)}</div>`).join('')}
      </div>
      <div class="carousel-controls">
        <button class="carousel-btn" data-dir="-1" aria-label="${esc(t('catalog.previous'))}">${ARROW.prev}</button>
        <button class="carousel-btn" data-dir="1" aria-label="${esc(t('catalog.next'))}">${ARROW.next}</button>
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
  renderCarousel(document.getElementById('catalogGrid'), collectItems(filter), t('catalog.aria'));
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
// ==========================================================================

// ==========================================================================
// 5. СТЕНА (магазин)
// ==========================================================================
const shopItems = () => (typeof shop !== 'undefined' && Array.isArray(shop) ? shop : []);
const findItem = (id) => shopItems().find((i) => String(i.id) === String(id));

// Пропорция работы: пустое место от проданной картины занимает ровно
// столько же, сколько занимала она сама
const ratioOf = (item) => item.ratio || '4/5';

const visualRatioOf = (item) => {
  const meta = typeof IMAGE_META === 'undefined' ? null : IMAGE_META[item.image];
  return meta?.width && meta?.height ? `${meta.width}/${meta.height}` : ratioOf(item);
};

const WALL_SIZES = '(max-width: 700px) 88vw, (max-width: 1100px) 44vw, 30vw';

function hangMarkup(item, i) {
  const sold = item.status === 'sold';
  const title = localized(item, 'title', t('messages.untitled'));
  const type = localized(item, 'type');
  const size = localized(item, 'size');
  const meta = [
    type ? `<span class="hang-type">${esc(type)}</span>` : '',
    size ? `<span class="hang-size">${esc(size)}</span>` : ''
  ].filter(Boolean).join('');
  const scale = item.scale === 's' || item.scale === 'l' ? ` is-${item.scale}` : '';
  const ratio = visualRatioOf(item);

  const body = sold
    ? `<div class="hang-ghost" style="aspect-ratio:${esc(ratio)}; opacity: 0.05" aria-hidden="true">
         ${imgTag(item.image, title, { sizes: WALL_SIZES, ratio })}
      </div>`
    : `<div class="hang-media" style="aspect-ratio:${esc(ratio)}">
         ${imgTag(item.image, title, { sizes: WALL_SIZES, ratio })}
       </div>`;

  const label = `
    <div class="hang-label">
      <span class="hang-index">№${num(i)}</span>
      <span class="hang-title">${esc(title)}
        ${meta ? `<span class="hang-meta">${meta}</span>` : ''}
        ${sold && item.collection ? `<span class="hang-collection">${esc(localized(item, 'collection'))}</span>` : ''}
      </span>
      <span class="hang-price">${sold ? esc(t('spread.soldIndex')) : moneyMarkup(item.price)}</span>
    </div>`;

  // Проданная работа тоже кликабельна: у неё есть своя история
  return `
    <article class="hang${scale}">
      <span class="hang-nail" aria-hidden="true"></span>
      <button class="hang-frame" data-open="${esc(item.id)}" aria-label="${esc(`${title} — ${t('spread.aria')}`)}">
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
    : `<p class="state-empty">${esc(t('catalog.empty'))}</p>`;
}

// ==========================================================================
// 6. РАЗВОРОТ РАБОТЫ
// ==========================================================================
let lastFocused = null;   // куда вернуть фокус после закрытия
let cleanupDetailCarousel = () => {};

function specRow(name, value) {
  return value ? `<div><span>${esc(name)}</span><span>${esc(value)}</span></div>` : '';
}

function detailImages(detail) {
  const values = Array.isArray(detail) ? detail : [detail];
  return values.filter((src) => typeof src === 'string' && src.trim());
}

const DETAIL_SIZES = '(max-width: 1024px) 90vw, 40vw';
const DETAIL_RATIO_FALLBACK = '16 / 9';

function detailRatioOf(src) {
  const meta = typeof IMAGE_META === 'undefined' ? null : IMAGE_META[src];
  return meta?.width && meta?.height ? `${meta.width} / ${meta.height}` : DETAIL_RATIO_FALLBACK;
}

function detailMarkup(detail) {
  if (!detail.length) return '';

  if (detail.length === 1) {
    return `
      <div class="spread-detail" style="--detail-ratio: ${detailRatioOf(detail[0])}">${imgTag(detail[0], t('spread.detailAlt'), { sizes: DETAIL_SIZES, loading: 'lazy', fetchPriority: 'auto' })}</div>
      <p class="spread-detail-note">${esc(t('spread.detailNote'))}</p>`;
  }

  return `
    <div class="spread-detail-gallery">
      <div class="spread-detail-track" style="--detail-ratio: ${detailRatioOf(detail[0])}" role="region" aria-roledescription="carousel" aria-label="${esc(t('spread.detailsAria'))}" tabindex="0">
        ${detail.map((src) => `
          <div class="spread-detail-slide" data-detail-ratio="${detailRatioOf(src)}">${imgTag(src, t('spread.detailAlt'), { sizes: DETAIL_SIZES, loading: 'lazy', fetchPriority: 'auto' })}</div>`).join('')}
      </div>
      <div class="spread-detail-controls">
        <button class="spread-detail-btn" type="button" data-detail-dir="-1" aria-label="${esc(t('spread.previousDetail'))}">${ARROW.prev}</button>
        <span class="spread-detail-counter" aria-live="polite"></span>
        <button class="spread-detail-btn" type="button" data-detail-dir="1" aria-label="${esc(t('spread.nextDetail'))}">${ARROW.next}</button>
      </div>
    </div>
    <p class="spread-detail-note">${esc(t('spread.detailNote'))}</p>`;
}

function wireDetailCarousel(root, total) {
  const track = root.querySelector('.spread-detail-track');
  if (!track || total < 2) return () => {};

  const buttons = [...root.querySelectorAll('.spread-detail-btn')];
  const counter = root.querySelector('.spread-detail-counter');
  const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const step = () => track.clientWidth || track.querySelector('.spread-detail-slide')?.getBoundingClientRect().width || 1;
  const behavior = () => (prefersReducedMotion.matches ? 'auto' : 'smooth');
  const slides = [...track.querySelectorAll('.spread-detail-slide')];
  let currentIndex = 0;
  let requestedIndex = 0;
  let targetIndex = null;
  let observedWidth = track.clientWidth;

  const setTrackRatio = (index) => {
    track.style.setProperty('--detail-ratio', slides[index]?.dataset.detailRatio || DETAIL_RATIO_FALLBACK);
  };

  const update = () => {
    const max = Math.max(0, track.scrollWidth - track.clientWidth);
    const index = Math.min(total - 1, Math.max(0, Math.round(track.scrollLeft / step())));
    currentIndex = index;
    setTrackRatio(targetIndex ?? index);
    if (targetIndex !== null && Math.abs(track.scrollLeft - targetIndex * step()) <= 2) {
      targetIndex = null;
      requestedIndex = index;
    } else if (targetIndex === null) {
      requestedIndex = index;
    }
    counter.textContent = `${num(index)} / ${num(total - 1)}`;
    buttons[0].disabled = requestedIndex === 0;
    buttons[1].disabled = requestedIndex === total - 1 || track.scrollLeft >= max - 2;
  };

  const move = (direction) => {
    requestedIndex = Math.min(total - 1, Math.max(0, requestedIndex + direction));
    targetIndex = requestedIndex;
    setTrackRatio(requestedIndex);
    track.scrollTo({ left: requestedIndex * step(), behavior: behavior() });
    update();
  };

  const onButtonClick = (event) => move(Number(event.currentTarget.dataset.detailDir));
  const onKeydown = (event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    move(event.key === 'ArrowRight' ? 1 : -1);
  };
  const onPointerDown = () => {
    targetIndex = null;
    requestedIndex = currentIndex;
  };

  let scrollFrame = 0;
  const onScroll = () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; update(); });
  };
  const observer = new ResizeObserver(([entry]) => {
    const width = entry.contentRect.width;
    if (Math.abs(width - observedWidth) < 1) return;
    observedWidth = width;
    track.scrollTo({ left: requestedIndex * step(), behavior: 'auto' });
    update();
  });

  buttons.forEach((button) => button.addEventListener('click', onButtonClick));
  track.addEventListener('keydown', onKeydown);
  track.addEventListener('pointerdown', onPointerDown, { passive: true });
  track.addEventListener('scroll', onScroll, { passive: true });
  observer.observe(track);
  update();

  return () => {
    if (scrollFrame) cancelAnimationFrame(scrollFrame);
    observer.disconnect();
    buttons.forEach((button) => button.removeEventListener('click', onButtonClick));
    track.removeEventListener('keydown', onKeydown);
    track.removeEventListener('pointerdown', onPointerDown);
    track.removeEventListener('scroll', onScroll);
  };
}

function openSpread(id) {
  const item = findItem(id);
  const spread = document.getElementById('spread');
  if (!item || !spread) return;

  lastFocused = document.activeElement;

  const index = shopItems().indexOf(item);
  const sold = item.status === 'sold';
  const details = detailImages(item.detail);

  cleanupDetailCarousel();
  cleanupDetailCarousel = () => {};
  spread.querySelector('.spread-inner').innerHTML = `
    <div class="spread-main">
      ${imgTag(item.image, localized(item, 'title', t('messages.untitled')), { loading: 'eager', fetchPriority: 'high', ratio: ratioOf(item) })}
    </div>

    <div class="spread-side">
      <span class="spread-index">№${num(index)}${sold ? ` — ${esc(t('spread.soldIndex'))}` : ''}</span>
      <h2 class="spread-title">${esc(localized(item, 'title', t('messages.untitled')))}</h2>

      ${detailMarkup(details)}

      ${item.about ? `<p class="spread-about">${esc(localized(item, 'about'))}</p>` : ''}

      <div class="spread-specs">
        ${specRow(t('spread.year'), value(item.year))}
        ${specRow(t('spread.material'), localized(item, 'material'))}
        ${specRow(t('spread.size'), localized(item, 'size'))}
        ${specRow(t('spread.type'), localized(item, 'type'))}
        ${specRow(t('spread.price'), sold ? '—' : money(item.price))}
      </div>

      ${sold
        ? `<p class="spread-sold">${esc(localized(item, 'collection', t('spread.soldDefault')))}</p>`
        : `<div class="spread-buy">
             <button class="btn" data-add="${esc(item.id)}">${esc(t('spread.addToCart'))} — ${money(item.price)}</button>
             <p class="spread-ship">${esc(t('spread.shipping'))}</p>
           </div>`}
    </div>`;

  cleanupDetailCarousel = wireDetailCarousel(spread.querySelector('.spread-side'), details.length);
  spread.classList.add('is-open');
  spread.setAttribute('aria-hidden', 'false');
  document.body.classList.add('is-locked');
  spread.querySelector('.spread-close')?.focus();
}

function closeSpread() {
  const spread = document.getElementById('spread');
  if (!spread?.classList.contains('is-open')) return;

  cleanupDetailCarousel();
  cleanupDetailCarousel = () => {};
  spread.classList.remove('is-open');
  spread.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('is-locked');
  lastFocused?.focus();
}

// ==========================================================================
// 7. КОРЗИНА
// ==========================================================================
const cart = {
  items: [],

  // Храним только id: цены и названия всегда берём из gallery.js,
  // иначе после правки прайса в корзине останется старая цена
  load() {
    try {
      const ids = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      this.items = ids.map(findItem).filter((i) => i && i.status !== 'sold');
    } catch (e) {
      this.items = [];
    }
  },

  save() {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(this.items.map((i) => i.id)));
    } catch (e) { /* приватный режим — просто не сохраняем */ }
  },

  add(id) {
    const product = findItem(id);
    if (!product || product.status === 'sold') return false;
    if (this.items.some((i) => i.id === product.id)) return false;  // оригинал один
    this.items.push(product);
    this.save();
    this.render();
    return true;
  },

  remove(id) {
    this.items = this.items.filter((i) => String(i.id) !== String(id));
    this.save();
    this.render();
  },

  total() { return this.items.reduce((sum, item) => sum + amount(item.price), 0); },

  render() {
    const body = document.getElementById('cartBody');
    if (!body) return;

    body.innerHTML = this.items.length
      ? this.items.map((i) => `
          <div class="cart-item">
            ${imgTag(i.image, '', { loading: 'lazy', fetchPriority: 'low', ratio: ratioOf(i), thumbnail: true })}
            <div>
              <h4>${esc(localized(i, 'title', t('messages.untitled')))}</h4>
              <span class="cart-item-note">${esc([localized(i, 'type'), localized(i, 'size')].filter(Boolean).join(' · '))}</span>
              <button class="cart-remove" data-remove="${esc(i.id)}">${esc(t('cart.remove'))}</button>
            </div>
            <span class="cart-item-price">${money(i.price)}</span>
          </div>`).join('')
      : `<p class="cart-empty">${esc(t('cart.empty'))}</p>`;

    document.getElementById('cartTotal').textContent = money(this.total());

    const count = this.items.length;
    const countElement = document.getElementById('cartCount');
    const toggle = document.getElementById('cartToggle');
    if (countElement) {
      countElement.textContent = String(count);
      countElement.hidden = count === 0;
    }
    toggle?.setAttribute(
      'aria-label',
      count ? t('cart.countLabel', { count }) : t('cart.emptyLabel')
    );

    const order = document.getElementById('cartOrder');
    order.classList.toggle('is-disabled', !this.items.length);
    order.setAttribute('aria-disabled', String(!this.items.length));
    order.href = this.items.length ? this.mailto() : '#';
  },

  // Бэкенда у статического хостинга нет — заказ уходит письмом
  mailto() {
    const lines = this.items.map((i) =>
      t('mail.lineSeparator', {
        title: localized(i, 'title', t('messages.untitled')),
        details: [localized(i, 'type'), localized(i, 'size')].filter(Boolean).join(', '),
        price: money(i.price)
      }));

    const body = [
      t('mail.greeting'), '',
      ...lines, '',
      t('mail.total', { total: money(this.total()) }), '',
      t('mail.name'),
      t('mail.location'),
      t('mail.address'),
      t('mail.phone')
    ].join('\n');

    return `mailto:${SHOP_EMAIL}?subject=${encodeURIComponent(t('mail.subject'))}&body=${encodeURIComponent(body)}`;
  }
};

let setCartOpen = () => {};

function initCart() {
  const panel = document.getElementById('cartPanel');
  const overlay = document.getElementById('cartOverlay');
  const toggle = document.getElementById('cartToggle');
  if (!panel || !toggle) return;

  toggle.dataset.badgePosition = ['top-right', 'bottom-right'].includes(CART_BADGE_POSITION)
    ? CART_BADGE_POSITION
    : 'top-right';

  setCartOpen = (open) => {
    panel.classList.toggle('is-open', open);
    overlay?.classList.toggle('is-open', open);
    panel.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('is-locked', open);
    if (open) panel.querySelector('.cart-close')?.focus();
  };

  toggle.addEventListener('click', () => setCartOpen(true));
  overlay?.addEventListener('click', () => setCartOpen(false));
  panel.querySelector('.cart-close')?.addEventListener('click', () => setCartOpen(false));

  toggle.hidden = false;
  cart.load();
  cart.render();
}

// ==========================================================================
// 8. ОБЩЕЕ ДЕЛЕГИРОВАНИЕ
// ==========================================================================
// Карточки перерисовываются при смене фильтра, поэтому слушаем документ
function initDelegation() {
  document.addEventListener('click', (e) => {
    const open = e.target.closest('[data-open]');
    if (open) { openSpread(open.dataset.open); return; }

    if (e.target.closest('.spread-close') || e.target.closest('.spread-overlay')) {
      closeSpread();
      return;
    }

    const add = e.target.closest('[data-add]');
    if (add) {
      const ok = cart.add(add.dataset.add);
      const original = add.textContent;
      add.textContent = ok ? t('messages.added') : t('messages.alreadyInCart');
      add.classList.add('btn-added');
      setTimeout(() => {
        add.textContent = original;
        add.classList.remove('btn-added');
      }, 1800);
      return;
    }

    const rm = e.target.closest('[data-remove]');
    if (rm) cart.remove(rm.dataset.remove);
  });

  // Один обработчик на всё: сначала верхний слой, потом нижний
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (document.getElementById('spread')?.classList.contains('is-open')) {
      closeSpread();
    } else {
      setCartOpen(false);
      document.querySelector('.menu')?.classList.remove('is-open');
      document.querySelector('.nav-toggle')?.setAttribute('aria-expanded', 'false');
    }
  });
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
  initSeriesBounds();
});
