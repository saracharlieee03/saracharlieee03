'use strict';
/* =========================================================
   exports.js · Salidas del tablero
   CSV / JSON de registros filtrados, CSV de preguntas,
   enlace para compartir e informe Word (.docx) con gráficas.
   ========================================================= */
(() => {
  const U = App.util, Dt = App.data, S = App.S, I = () => App.feat.insights;
  const cell = v => App.ui.cellCSV(v);

  function csv() {
    const lines = [Dt.D.labels.join(',')];
    for (const i of S.idx) lines.push(Dt.rowRaw(i).map(cell).join(','));
    U.download(`estudiantes_filtrados_${U.stamp()}.csv`, '\ufeff' + lines.join('\r\n'), 'text/csv;charset=utf-8');
    U.toast(`CSV exportado con ${U.fmt(S.idx.length)} registros`);
  }
  function json() {
    const out = S.idx.map(i => Object.fromEntries(Dt.rowRaw(i).map((v, k) => [Dt.D.labels[k], v])));
    U.download(`estudiantes_filtrados_${U.stamp()}.json`, JSON.stringify(out, null, 1), 'application/json');
    U.toast('JSON exportado');
  }
  function qa() {
    const l = ['Pregunta,Respuesta', ...I().QUESTIONS.map(x => cell(x.q) + ',' + cell(I().answer(x)))];
    U.download(`preguntas_analisis_${U.stamp()}.csv`, '\ufeff' + l.join('\r\n'), 'text/csv;charset=utf-8');
    U.toast('Preguntas exportadas');
  }
  async function share() {
    try { await navigator.clipboard.writeText(location.href); U.toast('Enlace copiado: abre esta misma vista con los mismos filtros'); }
    catch (e) { prompt('Copia este enlace:', location.href); }
  }

  /* ---------- Informe Word ---------- */
  const DIMS = [['Facultad', 8], ['Sede', 10], ['Programa', 10], ['Sexo', 5], ['Estrato', 7], ['Modalidad', 5], ['Colegio', 4], ['TipoInscripcion', 5], ['Institucion', 10], ['Comuna', 10]];
  const dimRows = (c, k) => Dt.count(c, S.idx, c === 'Estrato' ? { byLabel: true } : (c === 'Institucion' || c === 'Comuna') ? { na: true } : {}).slice(0, k).map(x => [x.name, U.fmt(x.n), U.pct(x.n, S.idx.length)]);

  function offChart(type, items, h) {
    const c = document.createElement('canvas'); c.width = 900; c.height = 420;
    const P = App.ui.palette();
    const ch = new Chart(c, { type, data: { labels: items.map(p => U.short(p.name, 36)), datasets: [{ data: items.map(p => p.n), backgroundColor: type === 'doughnut' ? items.map((_, j) => P[j % P.length]) : P[0], borderWidth: 0 }] },
      options: { animation: false, responsive: false, indexAxis: h ? 'y' : 'x', plugins: { legend: { display: type === 'doughnut', position: 'right', labels: { color: '#333' } } }, scales: type === 'doughnut' ? {} : { x: { ticks: { color: '#444' } }, y: { ticks: { color: '#444' } } } } });
    const d = ch.toBase64Image('image/png'); ch.destroy();
    return Uint8Array.from(atob(d.split(',')[1]), x => x.charCodeAt(0));
  }

  function word(o) {
    const n = S.idx.length, fecha = new Date().toLocaleDateString('es-CO');
    const fil = Object.entries(S.f).map(([c, v]) => [Dt.DIM[c], Dt.label(c, v)]);
    const kp = [['Estudiantes analizados', U.fmt(n)], ['Programas distintos', U.fmt(Dt.count('Programa', S.idx).length)], ['Sedes distintas', U.fmt(Dt.count('Sede', S.idx).length)], ['Instituciones de procedencia', U.fmt(Dt.count('Institucion', S.idx, { na: true }).length)]];
    const narr = I().narrative(S.idx, fil.length).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (typeof docx === 'undefined' || typeof Chart === 'undefined') return wordHTML(o, fecha, fil, kp, narr);
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, ImageRun, ShadingType } = docx;
    const F = 'Arial';
    const Pp = (t, s = {}) => new Paragraph({ children: [new TextRun({ text: t, font: F, size: 22, ...s })], spacing: { after: 120 } });
    const H = (t, l = HeadingLevel.HEADING_1) => new Paragraph({ children: [new TextRun({ text: t, font: F, bold: true, color: '1E6B57', size: l === HeadingLevel.HEADING_1 ? 30 : 25 })], heading: l, spacing: { before: 280, after: 120 } });
    const tc = (t, hd) => new TableCell({ children: [Pp(String(t), hd ? { bold: true, color: 'FFFFFF' } : {})], shading: hd ? { type: ShadingType.CLEAR, fill: '1E6B57', color: 'auto' } : undefined });
    const tab = (h, rows) => new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: h.map(x => tc(x, 1)), tableHeader: true }), ...rows.map(r => new TableRow({ children: r.map(x => tc(x)) }))] });
    const img = (t, type, items, h) => [Pp(t, { bold: true }), new Paragraph({ children: [new ImageRun({ data: offChart(type, items, h), transformation: { width: 580, height: 270 } })], spacing: { after: 160 } })];
    const ch = [
      new Paragraph({ children: [new TextRun({ text: o.t, font: F, bold: true, size: 40, color: '16202A' })], spacing: { after: 120 } }),
      Pp(`Generado el ${fecha}. Fuente: ${Dt.D.meta.archivo}, año ${Dt.D.meta.ano}.`, { color: '5E6B73' }),
      H('Resumen'), Pp(narr), tab(['Indicador', 'Valor'], kp),
      H('Filtros aplicados'), tab(['Filtro', 'Valor'], fil.length ? fil : [['Sin filtros', 'Toda la población']])
    ];
    if (o.ins) { const L = I().list(S.idx); if (L.length) { ch.push(H('Hallazgos automáticos')); L.forEach(x => ch.push(Pp(`${x.k}: ${x.v} ${x.t}`))); } }
    if (o.g) ch.push(H('Gráficas'), ...img('Estudiantes por facultad', 'doughnut', Dt.count('Facultad', S.idx), 0), ...img('Estudiantes por estrato', 'bar', Dt.count('Estrato', S.idx, { byLabel: true }), 0), ...img('Programas con más estudiantes', 'bar', Dt.count('Programa', S.idx).slice(0, 10), 1), ...img('Sedes con más estudiantes', 'bar', Dt.count('Sede', S.idx).slice(0, 10), 1));
    if (o.tb) { ch.push(H('Tablas de datos')); DIMS.forEach(([c, k]) => ch.push(H(Dt.DIM[c], HeadingLevel.HEADING_2), tab([Dt.DIM[c], 'Estudiantes', '% del total'], dimRows(c, k)))); }
    if (o.q) { ch.push(H('Preguntas de análisis')); I().QUESTIONS.forEach(x => ch.push(Pp(x.q, { bold: true }), Pp(I().answer(x)))); }
    Packer.toBlob(new Document({ sections: [{ children: ch }] })).then(b => { U.download(`informe_estudiantes_${U.stamp()}.docx`, b); U.toast('Informe Word generado'); });
  }
  function wordHTML(o, fecha, fil, kp, narr) {
    const t = (h, r) => `<table border="1" cellpadding="5" style="border-collapse:collapse;font-family:Arial"><tr>${h.map(x => `<th style="background:#1E6B57;color:#fff">${x}</th>`).join('')}</tr>${r.map(x => '<tr>' + x.map(y => `<td>${U.esc(String(y))}</td>`).join('') + '</tr>').join('')}</table>`;
    let h = `<h1>${U.esc(o.t)}</h1><p>${fecha}</p><h2>Resumen</h2><p>${U.esc(narr)}</p>${t(['Indicador', 'Valor'], kp)}<h2>Filtros</h2>${t(['Filtro', 'Valor'], fil.length ? fil : [['Sin filtros', 'Toda la población']])}`;
    if (o.tb) DIMS.forEach(([c, k]) => (h += `<h2>${Dt.DIM[c]}</h2>` + t([Dt.DIM[c], 'Estudiantes', '%'], dimRows(c, k))));
    if (o.q) h += '<h2>Preguntas</h2>' + I().QUESTIONS.map(x => `<p><b>${x.q}</b><br>${U.esc(I().answer(x))}</p>`).join('');
    U.download('informe_estudiantes.doc', new Blob(['<html><meta charset="utf-8"><body style="font-family:Arial">' + h + '</body></html>'], { type: 'application/msword' }));
    U.toast('Sin conexión a las librerías: se generó un .doc sin gráficas', 'warn');
  }

  function wordModal() {
    App.ui.modal(`<h3>${App.ui.icon('word', 20)} Informe en Word</h3>
      <p class="note">Incluye solo los ${U.fmt(S.idx.length)} estudiantes de los filtros activos.</p>
      <label class="fld"><span>Título</span><input id="mt" class="input" value="Informe de estudiantes ${Dt.D.meta.ano}"></label>
      <div class="checks"><label><input type="checkbox" id="mi" checked> Hallazgos automáticos</label><label><input type="checkbox" id="mg" checked> Gráficas</label>
      <label><input type="checkbox" id="mb" checked> Tablas de datos</label><label><input type="checkbox" id="mq" checked> Preguntas de análisis</label></div>
      <div class="m-act"><button class="btn ghost" data-close>Cancelar</button><button class="btn" id="mo">${App.ui.icon('download', 16)} Generar .docx</button></div>`,
    m => { m.querySelector('#mo').onclick = () => { const v = id => m.querySelector(id).checked; word({ t: m.querySelector('#mt').value || 'Informe', ins: v('#mi'), g: v('#mg'), tb: v('#mb'), q: v('#mq') }); m.close(); }; });
  }

  App.feat.exports = { csv, json, qa, share, word, wordModal };
})();
