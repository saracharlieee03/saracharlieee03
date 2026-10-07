'use strict';
/* ==========================================================================
   core/utils.js — Utilidades puras (sin DOM de la app): formato, texto, descargas.
   Todo el proyecto vive dentro de un solo espacio de nombres: window.App
   ========================================================================== */
window.App = window.App || {};

App.util = (() => {
  const fmt = n => Number(n).toLocaleString('es-CO');
  const pct = (a, b, d = 1) => (b ? (a * 100 / b).toFixed(d).replace('.', ',') : '0') + '%';
  const pp = x => (x > 0 ? '+' : '') + x.toFixed(1).replace('.', ',') + ' pp';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const short = (s, n = 28) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
  const stamp = () => new Date().toISOString().slice(0, 10);
  const debounce = (fn, ms = 180) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  /* Convierte "FACULTAD DE INGENIERÍAS" en "Facultad de Ingenierías" respetando siglas */
  const SMALL = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'en', 'el', 'a', 'para', 'por', 'con', 'o']);
  const KEEP = /^(UEM[BR]|CASD|I\.E\.?|C4TA|II|III|IV|TIC|TI|SST)$/;
  function pretty(s) {
    s = String(s).replace(/\*/g, '').trim();
    return s.toLowerCase().split(/(\s+|-)/).map((w, i) => {
      const up = w.toUpperCase();
      if (KEEP.test(up) || /\d/.test(w) || /\.\S/.test(w) || /^[a-z]\.$/i.test(w)) return up;
      if (i > 0 && SMALL.has(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join('');
  }

  /* Descargas */
  function download(content, name, type = 'text/plain') {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }
  const csvCell = v => { v = String(v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const toCSV = (heads, rows) => '\ufeff' + [heads, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n');

  return { fmt, pct, pp, esc, short, stamp, debounce, clamp, pretty, download, csvCell, toCSV };
})();
