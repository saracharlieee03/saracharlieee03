'use strict';
/* =========================================================
   components.js · Íconos SVG y piezas HTML reutilizables
   Cada vista arma su pantalla combinando estas piezas.
   ========================================================= */
(() => {
  const U = App.util;
  const P = {
    panorama: '<path d="M3 13h4v8H3zM10 8h4v13h-4zM17 3h4v18h-4z"/>',
    users: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M17 4a4 4 0 0 1 0 8M22 21a6 6 0 0 0-3.5-5.4"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5M9 7h6"/>',
    pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    school: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5M22 9v6"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    compare: '<path d="M4 7h13l-3-3M20 17H7l3 3"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7M12 17h.01"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/>',
    file: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>',
    cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M10 10h4v4h-4zM9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 17l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M4 20h16"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    chev: '<path d="M9 6l6 6-6 6"/>',
    word: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M8.5 11l1.2 5 1.3-4 1.3 4 1.2-5"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>'
  };
  const icon = (n, s = 18) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;

  /* Indicador: etiqueta, valor grande, nota y (opcional) barra de proporción */
  const kpi = (label, value, note = '', share = null, tone = '') =>
    `<div class="kpi ${tone}"><span class="kpi-l">${label}</span><b class="kpi-v" data-count="${U.esc(value)}">${value}</b>` +
    (share !== null ? `<i class="kpi-bar"><i style="width:${Math.max(0, Math.min(100, share)).toFixed(1)}%"></i></i>` : '') +
    `<small class="kpi-n">${note}</small></div>`;

  /* Tarjeta con gráfica: el botón de imagen descarga el canvas como PNG */
  const chartCard = (title, id, span = 'c6', sub = '', h = '') =>
    `<section class="card ${span}"><header class="card-h"><div><h3>${title}</h3>${sub ? `<p>${sub}</p>` : ''}</div>
     <button class="icon-btn" data-png="${id}" title="Descargar gráfica como imagen" aria-label="Descargar ${U.esc(title)} como imagen">${icon('image', 16)}</button></header>
     <div class="cv ${h}"><canvas id="${id}" role="img" aria-label="${U.esc(title)}"></canvas></div></section>`;

  const card = (title, body, span = 'c12', sub = '', extra = '') =>
    `<section class="card ${span}"><header class="card-h"><div><h3>${title}</h3>${sub ? `<p>${sub}</p>` : ''}</div>${extra}</header>${body}</section>`;

  const tableCard = (title, id, note = '', span = 'c12') => card(title, `<div id="${id}"></div>${note ? `<p class="note">${note}</p>` : ''}`, span);

  const empty = (msg, action = '') => `<div class="empty">${icon('filter', 28)}<p>${msg}</p>${action}</div>`;

  const select = (id, options, value, label) =>
    `<label class="fld"><span>${label}</span><select id="${id}">${options.map(([v, t]) => `<option value="${U.esc(v)}"${String(v) === String(value) ? ' selected' : ''}>${U.esc(t)}</option>`).join('')}</select></label>`;

  const seg = (name, options, value) =>
    `<div class="seg" role="radiogroup" data-seg="${name}">${options.map(([v, t]) => `<button role="radio" aria-checked="${v === value}" data-v="${v}" class="${v === value ? 'on' : ''}">${t}</button>`).join('')}</div>`;

  Object.assign(App.ui, { icon, kpi, chartCard, card, tableCard, empty, select, seg });
})();
