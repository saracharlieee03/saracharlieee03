'use strict';
/* ==========================================================================
   views/proyecto.js — Arquitectura del sistema (documentación viva)
   ========================================================================== */
(() => {
  const U = App.ui, S = App.store.state, { fmt, esc } = App.util, { R, COLS, meta } = App.data;

  const LAYERS = () => [
    ['Datos', 'lo que se analiza', [
      ['tools/convertir_excel.py', 'Convierte el Excel en data/datos.js. Se ejecuta solo cuando cambian los datos.'],
      ['data/datos.js', 'Diccionario de valores únicos por columna + filas codificadas como números. Carga en milisegundos.']]],
    ['Núcleo', 'lógica sin interfaz', [
      ['core/utils.js', 'Formatos numéricos, porcentajes, texto legible y descargas.'],
      ['core/data.js', 'Nombres de columnas, etiquetas legibles y grupos derivados (tipo de sede).'],
      ['core/store.js', 'Estado único (vista + filtros), eventos y sincronización con la URL.'],
      ['core/engine.js', 'Filtros, conteos, cruces, diversidad, HHI y V de Cramér.'],
      ['core/router.js', 'Registro de vistas: el menú se construye solo.']]],
    ['Servicios', 'resultados y salidas', [
      ['services/insights.js', 'Redacta hallazgos automáticos con cifras.'],
      ['services/questions.js', 'Preguntas de análisis con respuesta en vivo.'],
      ['services/export.js', 'CSV, JSON y enlace compartible.'],
      ['services/report.js', 'Informe Word con gráficas y tablas.']]],
    ['Interfaz', 'lo que ves', [
      ['ui/charts.js', 'Gráficas con tema, clic para filtrar, PNG y ampliación.'],
      ['ui/table.js', 'Tablas con búsqueda, orden, paginación y CSV.'],
      ['ui/filters.js · palette.js', 'Filtros dependientes, chips y buscador Ctrl+K.'],
      ['views/*.js', `${App.views.list().length} vistas agrupadas en ${App.views.GROUPS.length} secciones.`]]]
  ];

  const TREE = `dashboard-analytics/
├── index.html                 Estructura de la página (sin lógica)
├── README.md                  Cómo ejecutar, desplegar y extender
├── assets/css/
│   ├── tokens.css             Colores, tipografía y espacios (temas claro/oscuro)
│   ├── base.css · layout.css  Reset, rejilla, barra lateral
│   ├── components.css         Botones, paneles, KPI, tablas, ventanas
│   ├── views.css              Mosaico, treemap, mapa de calor, comparador
│   └── print.css              Versión para imprimir
├── data/datos.js              Datos codificados (generado)
├── tools/convertir_excel.py   Excel → datos.js
└── js/
    ├── core/                  utils · data · store · engine · router
    ├── services/              insights · questions · export · report
    ├── ui/                    icons · overlay · components · charts · table · filters · theme · palette
    ├── views/                 panorama · poblacion · analisis · herramientas · proyecto
    └── app.js                 Arranque y ciclo de renderizado`;

  App.views.add({
    id: 'arquitectura', label: 'Arquitectura', group: 'Proyecto', icon: 'arquitectura', sub: 'Cómo está construido el dashboard',
    render: () => ({
      html: `<div class="kpis">
          ${U.kpi({ label: 'Registros en memoria', value: fmt(R.length), sub: `desde ${esc(meta.archivo)}` })}
          ${U.kpi({ label: 'Columnas analizadas', value: COLS.length, sub: 'todas categóricas' })}
          ${U.kpi({ label: 'Vistas', value: App.views.list().length, sub: 'registradas en el router' })}
          ${U.kpi({ label: 'Filtros activos', value: Object.keys(S.filters).length, sub: `${fmt(S.idx.length)} registros seleccionados` })}
        </div>
        ${U.panel({ title: 'Capas del sistema', sub: 'Cada capa solo usa a las de su izquierda. Así un cambio de diseño no rompe los cálculos, y un cálculo nuevo no obliga a tocar el diseño.',
          body: `<div class="arch">${LAYERS().map(([t, s, mods]) => `<div class="layer"><h4>${t}<small>${s}</small></h4>${mods.map(([f, d]) => `<div class="mod"><code>${esc(f)}</code><p>${esc(d)}</p></div>`).join('')}</div>`).join('')}</div>` })}
        ${U.panel({ title: 'Qué pasa cuando aplicas un filtro', body: `<div class="flow"><span>Seleccionas un valor</span><em>→</em><span>store actualiza el estado y la URL</span><em>→</em><span>engine recalcula las filas</span><em>→</em><span>la vista pide conteos y cruces</span><em>→</em><span>charts y tables dibujan</span></div>
          <p class="note">Como los datos se guardan codificados (cada texto se reemplaza por un número), filtrar 29.014 registros toma pocos milisegundos y no se necesita servidor.</p>` })}
        ${U.panel({ title: 'Estructura de carpetas', body: `<div class="tree">${esc(TREE)}</div>` })}`,
      mount() {}
    })
  });
})();
