'use strict';
/* ==========================================================================
   services/report.js — Informe en Word (.docx) con los filtros activos.
   Usa la librería docx (CDN). Sin internet genera un .doc sencillo de respaldo.
   ========================================================================== */
App.report = (() => {
  const E = App.engine, S = App.store.state, { fmt, pct, esc, download, stamp } = App.util, { LABEL, label, meta } = App.data;

  const DIMS = [['Facultad', 8], ['Sede', 10], ['Programa', 10], ['Sexo', 5], ['Estrato', 7], ['Modalidad', 5], ['Colegio', 4], ['TipoInscripcion', 5], ['Institucion', 10], ['Comuna', 10]];
  const dimRows = (c, k) => E.count(c, c === 'Estrato' ? { byLabel: true } : { na: c === 'Institucion' || c === 'Comuna' }).slice(0, k).map(x => [x.label, fmt(x.n), pct(x.n, S.idx.length)]);
  const filtersList = () => { const f = Object.entries(S.filters).map(([c, v]) => [LABEL[c], label(c, v)]); return f.length ? f : [['Sin filtros', 'Todos los registros']]; };
  const kpis = () => [['Registros analizados', fmt(S.idx.length)], ['Programas distintos', fmt(E.count('Programa').length)], ['Sedes distintas', fmt(E.count('Sede').length)], ['Colegios de procedencia', fmt(E.count('Institucion', { na: true }).length)]];

  /* Dibuja una gráfica fuera de pantalla y la devuelve como bytes PNG */
  function chartPNG(type, items, horizontal) {
    const cv = document.createElement('canvas'); cv.width = 800; cv.height = 380;
    const pal = App.charts.PAL;
    const ch = new Chart(cv, { type, data: { labels: items.map(x => App.util.short(x.label, 36)), datasets: [{ data: items.map(x => x.n), backgroundColor: type === 'doughnut' ? items.map((_, j) => pal[j % pal.length]) : pal[0], borderColor: '#fff' }] },
      options: { animation: false, responsive: false, indexAxis: horizontal ? 'y' : 'x', plugins: { legend: { display: type === 'doughnut', position: 'right' } } } });
    const url = ch.toBase64Image('image/png'); ch.destroy();
    return Uint8Array.from(atob(url.split(',')[1]), c => c.charCodeAt(0));
  }

  function build(o) {
    const fecha = new Date().toLocaleDateString('es-CO');
    if (typeof docx === 'undefined') return fallback(o, fecha);
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, ImageRun, ShadingType } = docx;
    const P = (t, s = {}) => new Paragraph({ children: [new TextRun({ text: t, font: 'Arial', ...s })], spacing: { after: 100 } });
    const H = (t, level = HeadingLevel.HEADING_1) => new Paragraph({ text: t, heading: level, spacing: { before: 240, after: 100 } });
    const cell = (t, head) => new TableCell({ children: [P(String(t), head ? { bold: true, color: 'FFFFFF' } : {})], shading: head ? { type: ShadingType.CLEAR, fill: '0E7C72', color: 'auto' } : undefined });
    const table = (heads, rows) => new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ tableHeader: true, children: heads.map(h => cell(h, true)) }), ...rows.map(r => new TableRow({ children: r.map(x => cell(x)) }))] });
    const img = (type, items, h) => new Paragraph({ children: [new ImageRun({ data: chartPNG(type, items, h), transformation: { width: 580, height: 275 } })], spacing: { after: 120 } });

    const body = [new Paragraph({ text: o.title, heading: HeadingLevel.TITLE }), P(`Generado el ${fecha}. Fuente: ${meta.archivo}, año ${meta.ano}.`, { color: '5B6E71' }),
      H('Filtros aplicados'), table(['Filtro', 'Valor'], filtersList()), H('Resumen'), table(['Indicador', 'Valor'], kpis())];
    if (o.insights) { body.push(H('Hallazgos principales')); App.insights.generate().forEach(x => body.push(P(x.title, { bold: true }), P(`${x.fig} ${x.text}`))); }
    if (o.charts) body.push(H('Gráficas'), img('doughnut', E.count('Facultad'), 0), img('bar', E.count('Estrato', { byLabel: true }), 0), img('bar', E.count('Programa').slice(0, 10), 1), img('bar', E.count('Sede').slice(0, 10), 1));
    if (o.tables) { body.push(H('Tablas de datos')); DIMS.forEach(([c, k]) => body.push(H(LABEL[c], HeadingLevel.HEADING_2), table([LABEL[c], 'Registros', '% del total'], dimRows(c, k)))); }
    if (o.questions) { body.push(H('Preguntas de análisis')); App.questions.LIST.forEach(x => body.push(P(x.q, { bold: true }), P(App.questions.answer(x)))); }
    Packer.toBlob(new Document({ sections: [{ children: body }] })).then(b => { download(b, `informe_estudiantes_${stamp()}.docx`); App.ui.toast('Informe Word descargado'); });
  }

  function fallback(o, fecha) {
    const t = (h, r) => `<table border="1" cellpadding="4" style="border-collapse:collapse;font-family:Arial"><tr>${h.map(x => `<th style="background:#0e7c72;color:#fff">${esc(x)}</th>`).join('')}</tr>${r.map(x => '<tr>' + x.map(y => `<td>${esc(y)}</td>`).join('') + '</tr>').join('')}</table>`;
    let h = `<h1>${esc(o.title)}</h1><p>${fecha}. ${fmt(S.idx.length)} registros.</p><h2>Filtros</h2>${t(['Filtro', 'Valor'], filtersList())}<h2>Resumen</h2>${t(['Indicador', 'Valor'], kpis())}`;
    if (o.insights) h += '<h2>Hallazgos</h2>' + App.insights.generate().map(x => `<p><b>${esc(x.title)}</b><br>${esc(x.fig + ' ' + x.text)}</p>`).join('');
    if (o.tables) DIMS.forEach(([c, k]) => (h += `<h2>${LABEL[c]}</h2>` + t([LABEL[c], 'Registros', '%'], dimRows(c, k))));
    if (o.questions) h += '<h2>Preguntas</h2>' + App.questions.LIST.map(x => `<p><b>${esc(x.q)}</b><br>${esc(App.questions.answer(x))}</p>`).join('');
    download(new Blob(['<html><meta charset="utf-8"><body style="font-family:Arial">' + h + '</body></html>'], { type: 'application/msword' }), 'informe_estudiantes.doc');
    App.ui.toast('Sin conexión: se generó un .doc sin gráficas');
  }

  /* Ventana de opciones */
  function open() {
    const d = App.ui.modal(`<h3>Informe en Word</h3><p class="note">Incluirá los ${fmt(S.idx.length)} registros de los filtros activos.</p>
      <label class="check" style="display:grid;gap:4px">Título<input class="input" id="rt" value="Informe de estudiantes ${meta.ano}"></label>
      <label class="check"><input type="checkbox" id="ri" checked> Hallazgos principales</label>
      <label class="check"><input type="checkbox" id="rg" checked> Gráficas</label>
      <label class="check"><input type="checkbox" id="rb" checked> Tablas de datos</label>
      <label class="check"><input type="checkbox" id="rq" checked> Preguntas de análisis</label>
      <div class="dialog-foot"><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn" id="rgo">Descargar .docx</button></div>`);
    d.el.querySelector('#rgo').onclick = () => {
      const q = s => d.el.querySelector(s);
      build({ title: q('#rt').value || 'Informe', insights: q('#ri').checked, charts: q('#rg').checked, tables: q('#rb').checked, questions: q('#rq').checked });
      d.close();
    };
  }
  return { open, build };
})();
