'use strict';
/* ui/overlay.js — Avisos (toast) y ventanas modales accesibles */
(() => {
  function toast(text) {
    document.querySelectorAll('.toast').forEach(t => t.remove());
    const e = document.createElement('div'); e.className = 'toast'; e.setAttribute('role', 'status'); e.textContent = text;
    document.body.append(e); setTimeout(() => e.remove(), 2800);
  }
  /* Abre una ventana; devuelve { el, close }. Cierra con Esc, clic fuera o [data-close] */
  function modal(html, cls = '', onClose) {
    const prev = document.activeElement;
    const o = document.createElement('div'); o.className = 'overlay';
    o.innerHTML = `<div class="dialog ${cls}" role="dialog" aria-modal="true">${html}</div>`;
    document.body.append(o);
    const close = () => { onClose && onClose(); o.remove(); document.removeEventListener('keydown', key); prev && prev.focus && prev.focus(); };
    const key = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', key);
    o.addEventListener('click', e => { if (e.target === o || e.target.closest('[data-close]')) close(); });
    const f = o.querySelector('input, select, button:not([data-close])'); f && f.focus();
    return { el: o.querySelector('.dialog'), close };
  }
  Object.assign(App.ui, { toast, modal });
})();
