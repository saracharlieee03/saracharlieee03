'use strict';
/* =========================================================
   util.js · Utilidades generales (formato, DOM, descargas)
   Crea el espacio de nombres global App que usan todos los módulos.
   ========================================================= */
window.App = { views: {}, util: {}, ui: {}, feat: {} };

(() => {
  const U = App.util;
  const SMALL = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'en', 'a', 'o', 'u', 'con', 'por', 'para', 'al']);
  const KEEP = new Set(['UEMB', 'UEMR', 'CASD', 'C4TA', 'IE', 'SENA', 'ITM', 'II', 'III', 'IV']);

  U.fmt = n => Number(n || 0).toLocaleString('es-CO');
  U.pctN = (a, b) => (b ? (a * 100) / b : 0);
  U.pct = (a, b, d = 1) => U.pctN(a, b).toFixed(d).replace('.', ',') + '%';
  U.num = (v, d = 1) => Number(v).toFixed(d).replace('.', ',');
  U.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.$ = (s, r = document) => r.querySelector(s);
  U.$$ = (s, r = document) => [...r.querySelectorAll(s)];
  U.stamp = () => new Date().toISOString().slice(0, 10);
  U.short = (s, n = 30) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
  U.norm = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  /* Convierte "FACULTAD DE INGENIERÍAS" en "Facultad de Ingenierías" respetando siglas */
  U.tc = s => String(s).split(/(\s+|-|\/|\(|\))/).map((w, i) => {
    if (!w || /^[\s\-/()]+$/.test(w)) return w;
    if (KEEP.has(w) || /\d/.test(w) || /\./.test(w)) return w;
    const l = w.toLowerCase();
    if (i > 0 && SMALL.has(l)) return l;
    return l.charAt(0).toUpperCase() + l.slice(1);
  }).join('');

  U.debounce = (fn, ms = 150) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  U.download = (name, data, type = 'text/plain') => {
    const blob = data instanceof Blob ? data : new Blob([data], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  };

  U.toast = (text, kind = 'ok') => {
    let box = U.$('#toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.append(box); }
    const t = document.createElement('div'); t.className = 'toast ' + kind; t.textContent = text; box.append(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 2600);
  };

  U.store = {
    get: (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento disponible */ } }
  };

  U.css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
})();
