'use strict';
/* =========================================================
   Vistas de datos: Explorador · Reportes · Arquitectura
   ========================================================= */
(() => {
  const U = App.util, Dt = App.data, ui = App.ui, S = App.S;

  /* ---------- Explorador de registros ---------- */
  const COLS = ['Sede', 'Facultad', 'Programa', 'TipoPrograma', 'Sexo', 'Estrato', 'Modalidad', 'TipoInscripcion', 'Colegio', 'Institucion', 'Comuna', 'Barrio', 'Departamento', 'Pais'];
  const X = { hide: new Set([3, 7, 11, 12]) };
  App.views.explorador = {
    title: 'Explorador de registros', group: 'Datos', icon: 'search',
    desc: 'Consulta fila por fila los registros originales del Excel.',
    render(idx) {
      const vis = COLS.map((c, k) => k).filter(k => !X.hide.has(k));
      return [`<section class="card c12"><header class="card-h"><div><h3>Registros</h3><p>Respeta los filtros de arriba. Busca texto, ordena por columna y elige qué columnas ver.</p></div></header>
          <details class="colpick"><summary>${ui.icon('grid', 15)} Columnas visibles (${vis.length} de ${COLS.length})</summary>
          <div class="cols">${COLS.map((c, k) => `<label><input type="checkbox" data-h="${k}"${X.hide.has(k) ? '' : ' checked'}> ${Dt.DIM[c]}</label>`).join('')}</div></details>
          <div id="ex"></div></section>`, v => {
        v.querySelector('.cols').onchange = e => { const k = +e.target.dataset.h; e.target.checked ? X.hide.delete(k) : X.hide.add(k); App.render(); };
        const K = vis.map(k => Dt.C[COLS[k]]), R = Dt.R;
        ui.table('ex', vis.map(k => Dt.DIM[COLS[k]]), idx.map(i => K.map((col, t) => Dt.label(COLS[vis[t]], R[i][col]))), { size: 25, name: 'registros' });
      }];
    }
  };

  /* ---------- Reportes y exportación ---------- */
  App.views.reportes = {
    title: 'Reportes y exportación', group: 'Datos', icon: 'file',
    desc: 'Descarga lo que ves: Word, CSV, JSON o un enlace a esta vista.',
    render(idx) {
      const E = App.feat.exports, f = Object.entries(S.f);
      const tile = (id, ic, t, d) => `<button class="tile" id="${id}"><span class="tile-ic">${ui.icon(ic, 22)}</span><b>${t}</b><small>${d}</small></button>`;
      return [`<div class="tiles">
          ${tile('rw', 'word', 'Informe en Word', 'Resumen, hallazgos, gráficas, tablas y preguntas en un .docx listo para entregar.')}
          ${tile('rc', 'download', 'Registros en CSV', `${U.fmt(idx.length)} filas con las ${Dt.D.cols.length} columnas. Se abre en Excel.`)}
          ${tile('rj', 'download', 'Registros en JSON', 'Para usar los datos filtrados en otro programa o API.')}
          ${tile('rq', 'help', 'Preguntas en CSV', 'Las preguntas de análisis con su respuesta actual.')}
          ${tile('rs', 'link', 'Copiar enlace', 'La URL guarda la vista y los filtros: quien la abra verá lo mismo.')}
        </div>
        <section class="card c12"><header class="card-h"><div><h3>Qué se va a exportar</h3></div></header>
          <p>${f.length ? 'Filtros activos: ' + f.map(([c, v]) => `<span class="a-chip">${Dt.DIM[c]}: ${U.esc(Dt.label(c, v))}</span>`).join(' ') : 'Sin filtros: se exporta toda la población.'}</p>
          <p class="note">Fuente: ${U.esc(Dt.D.meta.archivo)}. ${U.fmt(idx.length)} de ${U.fmt(Dt.R.length)} registros.</p></section>`, () => {
        U.$('#rw').onclick = E.wordModal; U.$('#rc').onclick = E.csv; U.$('#rj').onclick = E.json; U.$('#rq').onclick = E.qa; U.$('#rs').onclick = E.share;
      }];
    }
  };

  /* ---------- Arquitectura del proyecto ---------- */
  const LAYERS = [
    ['Datos', 'data/', [['datos.js', 'Excel convertido a diccionarios + filas de enteros.']]],
    ['Núcleo', 'src/core/', [['util.js', 'Formato, DOM, descargas, avisos.'], ['data.js', 'Motor de consultas: filtrar, contar, cruzar.'], ['state.js', 'Estado único y enlace compartible.']]],
    ['Interfaz', 'src/ui/', [['components.js', 'Íconos, indicadores y tarjetas.'], ['charts.js', 'Gráficas Chart.js con drill-down.'], ['table.js', 'Tablas con búsqueda y orden.'], ['viz.js', 'Waffle, treemap y mapa de calor propios.']]],
    ['Funciones', 'src/features/', [['filters.js', 'Filtros dependientes y chips.'], ['insights.js', 'Narrativa, hallazgos y preguntas.'], ['assistant.js', 'Asistente IA (local + Gemini).'], ['palette.js', 'Paleta Ctrl + K y modales.'], ['exports.js', 'Word, CSV, JSON, enlace.']]],
    ['Vistas', 'src/views/', [['panorama.js', 'Panorama general.'], ['mapa.js', 'Mapa con Leaflet.'], ['tresd.js', 'Ciudad de datos 3D.'], ['poblacion.js · academico.js', 'Vistas temáticas.'], ['analisis.js · datos.js', 'Análisis y datos.']]],
    ['Arranque', 'src/app.js', [['app.js', 'Menú, tema, atajos y render.']]]
  ];
  App.views.arquitectura = {
    title: 'Arquitectura', group: 'Datos', icon: 'cpu',
    desc: 'Cómo está construido el tablero, capa por capa.',
    render(idx) {
      return [`<section class="card c12"><header class="card-h"><div><h3>Capas del sistema</h3><p>Cada capa solo usa las de arriba. Así, cambiar una gráfica no rompe el motor de datos.</p></div></header>
          <ol class="arch">${LAYERS.map((l, j) => `<li style="--k:${j}"><div class="arch-h"><span class="arch-n">${j + 1}</span><b>${l[0]}</b><code>${l[1]}</code></div>
            <div class="arch-f">${l[2].map(f => `<div><code>${f[0]}</code><small>${f[1]}</small></div>`).join('')}</div></li>`).join('')}</ol></section>
        <div class="kpis">${ui.kpi('Registros en memoria', U.fmt(Dt.R.length), 'codificados como enteros')}${ui.kpi('Columnas', Dt.D.cols.length, 'dimensiones analizables')}${ui.kpi('Vistas', Object.keys(App.views).length, 'conectadas al mismo estado')}${ui.kpi('Filtrados ahora', U.fmt(idx.length), Object.keys(S.f).length + ' filtros activos')}</div>
        <section class="card c12"><header class="card-h"><div><h3>Flujo de un clic</h3></div></header>
          <p class="flow"><span>Clic en una barra</span>${ui.icon('arrow', 16)}<span>App.setFilter()</span>${ui.icon('arrow', 16)}<span>data.apply() recalcula índices</span>${ui.icon('arrow', 16)}<span>la vista se vuelve a dibujar</span>${ui.icon('arrow', 16)}<span>la URL se actualiza</span></p></section>`, () => {}];
    }
  };
})();
