'use strict';
/* ui/components.js — Plantillas HTML reutilizables (devuelven texto HTML) */
(() => {
  const { esc } = App.util, icon = App.ui.icon;

  /* Panel genérico */
  const panel = ({ title = '', sub = '', body = '', span = 12, tools = '', cls = '' }) =>
    `<section class="panel span-${span} ${cls}">${title ? `<header class="panel-head"><div><h3>${esc(title)}</h3>${sub ? `<p>${sub}</p>` : ''}</div>${tools ? `<div class="panel-tools">${tools}</div>` : ''}</header>` : ''}${body}</section>`;

  /* Panel con gráfica: incluye botones para ampliar y descargar PNG */
  const chartPanel = ({ id, title, sub = '', span = 6, tall = false, extra = '' }) => panel({
    title, sub, span, body: extra + `<div class="chart-box${tall ? ' tall' : ''}"><canvas id="${id}" role="img" aria-label="${esc(title)}"></canvas></div>`,
    tools: `<button class="tool" data-chart="expand" data-id="${id}" data-title="${esc(title)}" title="Ampliar">${icon('expand')}</button><button class="tool" data-chart="png" data-id="${id}" data-title="${esc(title)}" title="Descargar PNG">${icon('image')}</button>`
  });

  /* Tarjeta de indicador; meter = proporción 0–1 para la barrita inferior */
  const kpi = ({ label, value, sub = '', meter, accent }) =>
    `<div class="kpi${accent ? ' is-accent' : ''}"><span>${esc(label)}</span><b>${value}</b><small>${sub}</small>${meter !== undefined ? `<div class="meter"><i style="width:${(Math.min(1, meter) * 100).toFixed(1)}%"></i></div>` : ''}</div>`;

  /* Control segmentado: grupo de botones excluyentes */
  const seg = (name, options, current, aria) =>
    `<div class="seg" role="group" aria-label="${esc(aria || name)}">${options.map(([v, l]) => `<button data-seg="${name}" data-val="${v}" aria-pressed="${String(v) === String(current)}">${esc(l)}</button>`).join('')}</div>`;

  /* Lista desplegable */
  const select = (id, options, current, first) =>
    `<select id="${id}">${first ? `<option value="">${esc(first)}</option>` : ''}${options.map(([v, l]) => `<option value="${v}"${String(v) === String(current) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;

  const empty = (title, text, action = '') => `<div class="panel empty"><h3>${esc(title)}</h3><p style="margin:0 auto">${text}</p>${action}</div>`;

  Object.assign(App.ui, { panel, chartPanel, kpi, seg, select, empty });
})();
