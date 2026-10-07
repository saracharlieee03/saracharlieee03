'use strict';
/* ==========================================================================
   core/router.js — Registro de vistas. Cada vista se declara así:
   App.views.add({ id, label, group, icon, sub, render: () => ({ html, mount(el) }) })
   El menú lateral y el buscador Ctrl+K se construyen solos a partir de este registro.
   ========================================================================== */
App.views = (() => {
  const GROUPS = ['Panorama', 'Población', 'Análisis avanzado', 'Herramientas', 'Proyecto'];
  const all = [];
  const add = v => all.push(v);
  const list = () => GROUPS.flatMap(g => all.filter(v => v.group === g));
  const get = id => all.find(v => v.id === id);
  return { GROUPS, add, list, get };
})();
