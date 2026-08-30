// ==========================================================================
// ДВИЖЕНИЕ
// Один цикл кадров на всю страницу — сколько бы элементов ни двигалось.
// Отдельный обработчик scroll на каждый элемент положил бы страницу.
// ==========================================================================

(function () {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;   // ничего не инициализируем, CSS уже всё показал

  // Класс включает стартовые состояния из motion.css.
  // Ставим из скрипта: если он не загрузится, контент останется видимым.
  document.documentElement.classList.add('js-motion');

  // ------------------------------------------------------------------------
  // 1. ПОЯВЛЕНИЕ
  // ------------------------------------------------------------------------
  function initReveal() {
    const items = document.querySelectorAll('[data-reveal]');
    if (!items.length) return;

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const delay = Number(entry.target.dataset.delay || 0);
        setTimeout(() => entry.target.classList.add('is-visible'), delay);

        // Показали один раз и отпустили — обратного хода не нужно
        io.unobserve(entry.target);
      });
    }, {
      rootMargin: '0px 0px -12% 0px',   // срабатывает чуть раньше нижнего края
      threshold: 0.05
    });

    items.forEach((el) => io.observe(el));
  }

  // ------------------------------------------------------------------------
  // 2. ПАРАЛЛАКС И ЛЕНТЫ
  // ------------------------------------------------------------------------
  const parallaxItems = [];
  const stripItems = [];
  let ticking = false;

  function collect() {
    parallaxItems.length = 0;
    stripItems.length = 0;

    document.querySelectorAll('[data-parallax]').forEach((el) => {
      parallaxItems.push({ el, speed: parseFloat(el.dataset.parallax) || 0.2, visible: false });
    });

    document.querySelectorAll('[data-strip]').forEach((el) => {
      stripItems.push({
        el,
        distance: parseFloat(el.dataset.strip) || 300,
        scene: el.closest('.scene') || el.parentElement,
        visible: false
      });
    });

    // Считаем только то, что в кадре: за пределами экрана вычисления бессмысленны
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const record =
          parallaxItems.find((p) => p.el === entry.target) ||
          stripItems.find((s) => s.el === entry.target);
        if (record) record.visible = entry.isIntersecting;
      });
    }, { rootMargin: '20% 0px 20% 0px' });

    [...parallaxItems, ...stripItems].forEach((r) => io.observe(r.el));
  }

  function update() {
    const vh = innerHeight;

    parallaxItems.forEach(({ el, speed, visible }) => {
      if (!visible) return;
      const rect = el.getBoundingClientRect();
      // 0 в центре экрана, ±1 у краёв
      const progress = (rect.top + rect.height / 2 - vh / 2) / vh;
      el.style.setProperty('--shift', `${-progress * speed * 100}px`);
    });

    stripItems.forEach(({ el, distance, scene, visible }) => {
      if (!visible || !scene) return;
      const rect = scene.getBoundingClientRect();
      // 0 когда секция входит снизу, 1 когда полностью ушла вверх
      const progress = 1 - (rect.top + rect.height) / (vh + rect.height);
      el.style.setProperty('--strip-shift', `${-progress * distance}px`);
    });

    ticking = false;
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  // ------------------------------------------------------------------------
  // 3. ЗАПУСК
  // ------------------------------------------------------------------------
  function init() {
    initReveal();
    collect();
    update();

    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', () => { collect(); update(); }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Разделы подгружаются скриптом — пересобираем список после отрисовки
  window.refreshMotion = () => { collect(); initReveal(); update(); };
})();
