// ==========================================================================
// 1. ПОДГРУЗКА HTML-ЧАСТЕЙ
// ==========================================================================
// Работает только по http(s). При открытии файла двойным кликом (file://)
// fetch блокируется браузером — запускай локальный сервер:
//   python3 -m http.server 5500
async function loadParts() {
  const elements = [...document.querySelectorAll('[data-include]')];
  if (!elements.length) return;

  await Promise.all(elements.map(async (el) => {
    try {
      const res = await fetch(el.dataset.include);
      if (!res.ok) throw new Error(res.status);
      el.outerHTML = await res.text();
    } catch (e) {
      console.error('Не загрузилась часть HTML:', el.dataset.include, e);
    }
  }));

  // Если внутри подключённой части есть свои data-include — обрабатываем их
  if (document.querySelector('[data-include]')) await loadParts();
}

// ==========================================================================
// 2. МОБИЛЬНОЕ МЕНЮ
// ==========================================================================
function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.querySelector('.menu');
  if (!toggle || !menu) return;

  const setOpen = (open) => {
    menu.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    document.body.classList.toggle('nav-open', open);
  };

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  // Клик по ссылке — закрываем панель
  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });

  // Возврат на десктоп — сбрасываем состояние
  matchMedia('(min-width: 861px)').addEventListener('change', (e) => {
    if (e.matches) setOpen(false);
  });
}

// ==========================================================================
// 3. ПОДСВЕТКА ТЕКУЩЕГО РАЗДЕЛА В МЕНЮ
// ==========================================================================
function initScrollSpy() {
  const links = [...document.querySelectorAll('.menu a[href^="#"]')];
  const sections = links
    .map((a) => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);
  if (!sections.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((a) => {
        a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id);
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });

  sections.forEach((s) => observer.observe(s));
}

// ==========================================================================
// 4. КАРУСЕЛЬ
// ==========================================================================
const ARROW = {
  prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M15 4 7 12l8 8"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M9 4l8 8-8 8"/></svg>'
};

function escapeHtml(str = '') {
  return String(str).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Подпись под работой. Берём поля из gallery.js, если их нет — не выдумываем.
function buildCaption(item) {
  return [item.year, item.material, item.size].filter(Boolean).join(' · ');
}

function slideMarkup(item, eager) {
  const title = escapeHtml(item.title || 'Без названия');
  const caption = escapeHtml(buildCaption(item));
  return `
    <div class="carousel-slide">
      <article class="art-card">
        <div class="art-card-img-wrapper">
          <img src="${escapeHtml(item.image)}" alt="${title}"
               loading="${eager ? 'eager' : 'lazy'}" decoding="async">
        </div>
        <div class="art-card-info">
          <h3>${title}</h3>
          ${caption ? `<span>${caption}</span>` : ''}
        </div>
      </article>
    </div>`;
}

/**
 * Собирает карусель внутри контейнера.
 * @param {HTMLElement} root  контейнер (например #catalogGrid)
 * @param {Array} items       массив работ из gallery.js
 * @param {string} label      подпись для скринридеров
 */
function renderCarousel(root, items, label = 'Работы') {
  if (!root) return;

  if (!items || !items.length) {
    root.innerHTML = '<p class="carousel-empty">В этой категории пока пусто.</p>';
    return;
  }

  root.innerHTML = `
    <div class="carousel">
      <div class="carousel-track" role="region" aria-label="${escapeHtml(label)}" tabindex="0">
        ${items.map((item, i) => slideMarkup(item, i < 2)).join('')}
      </div>
      <div class="carousel-controls">
        <button class="carousel-btn" data-dir="-1" aria-label="Предыдущая работа">${ARROW.prev}</button>
        <button class="carousel-btn" data-dir="1" aria-label="Следующая работа">${ARROW.next}</button>
        <span class="carousel-counter" aria-live="polite">01 / ${String(items.length).padStart(2, '0')}</span>
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
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return slide.getBoundingClientRect().width + gap;
  };

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      track.scrollBy({ left: step() * Number(btn.dataset.dir), behavior: 'smooth' });
    });
  });

  // Стрелки на клавиатуре, когда дорожка в фокусе
  track.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    track.scrollBy({ left: step() * (e.key === 'ArrowRight' ? 1 : -1), behavior: 'smooth' });
  });

  const update = () => {
    const max = track.scrollWidth - track.clientWidth;
    const visible = Math.max(1, Math.round(track.clientWidth / step()));
    const index = max > 0 ? Math.round(track.scrollLeft / step()) : 0;

    counter.textContent =
      `${String(Math.min(index + 1, total)).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;

    // Ширина индикатора = доля видимых слайдов, сдвиг = прогресс скролла
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

// ==========================================================================
// 5. КАТАЛОГ + ТАБЫ
// ==========================================================================
function collectItems(filter) {
  if (typeof gallery === 'undefined') return [];
  if (filter === 'all') return Object.values(gallery).flat();
  return gallery[filter] || [];
}

function renderCatalog(filter = 'all') {
  const grid = document.getElementById('catalogGrid');
  if (!grid) return;
  renderCarousel(grid, collectItems(filter), 'Серия работ');
}

function initTabs() {
  const tabs = [...document.querySelectorAll('.tab-btn')];
  if (!tabs.length) return;

  tabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabs.forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');           // currentTarget вместо target:
      btn.setAttribute('aria-selected', 'true'); // клик по вложенному span не ломает логику
      renderCatalog(btn.dataset.category);
    });
  });
}

function initShop() {
  const grid = document.getElementById('shopGrid');
  if (!grid || typeof shop === 'undefined') return;
  renderCarousel(grid, shop, 'Лавка');
}

// ==========================================================================
// 6. ЗАПУСК
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  await loadParts();
  initNav();
  initTabs();
  renderCatalog('all');
  initShop();
  initScrollSpy();
});