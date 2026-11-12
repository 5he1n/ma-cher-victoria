(() => {
  'use strict';
  function initializeShelf(shelf) {
    const triggers = [...shelf.querySelectorAll('[data-book-trigger]')];
    const panels = [...shelf.querySelectorAll('[data-book-panel]')];
    if (!triggers.length || triggers.length !== panels.length) return;
    const entries = triggers.map(trigger => ({
      trigger,
      panel: panels.find(panel => panel.dataset.bookId === trigger.dataset.bookId && panel.id === trigger.getAttribute('aria-controls'))
    }));
    // Keep the readable fallback if the generated structure is incomplete.
    if (entries.some(entry => !entry.panel || !entry.panel.querySelector('[data-book-close]'))) return;
    const mouseHover = matchMedia('(hover: hover) and (pointer: fine)');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let active = null;
    let pinned = false;

    function close(restoreFocus = false) {
      if (!active) return;
      const previous = active;
      if (restoreFocus || previous.panel.contains(document.activeElement)) previous.trigger.focus({preventScroll:true});
      previous.trigger.setAttribute('aria-expanded', 'false');
      previous.trigger.classList.remove('is-active');
      previous.panel.hidden = true;
      previous.panel.classList.remove('is-opening');
      active = null;
      pinned = false;
      shelf.classList.remove('is-pinned');
    }
    function open(entry, pin) {
      if (active !== entry) {
        close();
        active = entry;
        entry.panel.hidden = false;
        entry.trigger.setAttribute('aria-expanded', 'true');
        entry.trigger.classList.add('is-active');
        if (!reducedMotion.matches) entry.panel.classList.add('is-opening');
      }
      pinned = pin;
      shelf.classList.toggle('is-pinned', pinned);
    }
    entries.forEach(entry => {
      entry.trigger.addEventListener('pointerenter', event => {
        if (event.pointerType !== 'mouse' || !mouseHover.matches || pinned) return;
        if (active?.panel.contains(document.activeElement)) return;
        open(entry, false);
      });
      entry.trigger.addEventListener('click', () => {
        if (active === entry && pinned) close();
        else open(entry, true);
      });
      entry.panel.querySelector('[data-book-close]').addEventListener('click', () => close(true));
      entry.panel.addEventListener('animationend', event => {
        if (event.target === entry.panel) entry.panel.classList.remove('is-opening');
      });
      entry.panel.addEventListener('focusin', () => {
        if (active === entry) { pinned = true; shelf.classList.add('is-pinned'); }
      });
    });
    shelf.addEventListener('pointerleave', event => {
      if (event.pointerType === 'mouse' && !pinned && !active?.panel.contains(document.activeElement)) close();
    });
    document.addEventListener('pointerdown', event => {
      if (active && !shelf.contains(event.target)) close();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && active) { event.preventDefault(); close(true); }
    });
    reducedMotion.addEventListener('change', event => {
      if (event.matches) panels.forEach(panel => panel.classList.remove('is-opening'));
    });
    // Enhance only after all event handlers have been installed.
    entries.forEach(({trigger,panel}) => {
      trigger.hidden = false;
      panel.querySelector('[data-book-close]').hidden = false;
      trigger.setAttribute('aria-expanded','false');
      panel.hidden = true;
    });
    shelf.classList.add('is-enhanced');
  }
  document.querySelectorAll('[data-bookshelf]').forEach(initializeShelf);
})();
