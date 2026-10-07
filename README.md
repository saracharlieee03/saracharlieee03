# Analítica estudiantil · Tablero interactivo

Tablero web para analizar 29.014 registros de estudiantes (archivo `datos_limpios_final.xlsx`, año 2026).
No necesita servidor ni instalación: abre `index.html` en el navegador (con internet, para cargar las librerías).

## Qué trae

- **Panorama**: resumen escrito automáticamente, gráfico "si fueran 100 estudiantes", indicadores y hallazgos automáticos que se pueden aplicar como filtro.
- **Mapa** (Leaflet): burbujas por comuna de residencia o por sede. Clic en una burbuja para filtrar.
- **Ciudad de datos 3D** (Three.js): torres que cruzan dos variables; se gira con el mouse y se filtra con clic.
- **Asistente IA**: responde preguntas en español sobre los datos filtrados. Funciona sin llaves con un motor local; opcionalmente se conecta a Gemini.
- **Análisis**: tabla dinámica con mapa de calor, comparador de dos grupos y preguntas de análisis.
- **Datos**: explorador de registros, exportación (Word, CSV, JSON), enlace compartible y diagrama de arquitectura.
- Tema claro/oscuro, paleta de comandos `Ctrl + K`, atajo `/` para el asistente, diseño adaptable a celular.

## Estructura (arquitectura por capas)

```
dashboard-analytics/
├── index.html              Estructura de la página y orden de carga
├── data/datos.js           1. Datos: Excel codificado (diccionarios + filas de enteros)
├── src/core/               2. Núcleo (sin gráficas)
│   ├── util.js                formato, descargas, avisos
│   ├── data.js                motor de consultas: filtrar, contar, cruzar
│   └── state.js               estado único + URL compartible
├── src/ui/                 3. Interfaz reutilizable
│   ├── components.js          íconos, indicadores, tarjetas
│   ├── charts.js              Chart.js con drill-down
│   ├── table.js               tablas con búsqueda, orden y CSV
│   └── viz.js                 waffle, treemap, mapa de calor
├── src/features/           4. Funciones
│   ├── filters.js             filtros dependientes y chips
│   ├── insights.js            narrativa, hallazgos, preguntas, lectura de preguntas libres
│   ├── assistant.js           asistente IA (local + Gemini)
│   ├── palette.js             Ctrl + K y ventanas modales
│   └── exports.js             Word, CSV, JSON, enlace
├── src/views/              5. Una pantalla por archivo temático
└── src/app.js              6. Arranque: menú, tema, atajos
```

Cada capa solo usa las anteriores. Para agregar una vista nueva: crea un objeto en `App.views` (con `title`, `group`, `icon`, `desc` y `render(idx)`) y agrega su id en `App.nav` dentro de `src/app.js`.

## Activar Gemini en el asistente (opcional)

1. Crea una API key en Google AI Studio.
2. En el tablero abre el asistente y toca el ícono de engranaje.
3. Pega la llave y guarda. Se guarda solo en tu navegador.

El asistente envía a Gemini un resumen numérico de los datos filtrados, no los registros individuales.
**No subas la llave a GitHub ni la escribas en el código.** Si el nombre del modelo cambia, se puede editar en la misma ventana.

## Publicar

Es un sitio estático: sirve en GitHub Pages o en Render como *Static Site* (sin comando de build, carpeta de publicación `.`).

## Notas

- Las coordenadas del mapa son aproximadas (centro de cada comuna o municipio); los lugares sin coordenadas se listan en una tabla aparte.
- Registros con valor `DESCONOCIDO` se excluyen de los rankings y se informa cuántos son.
