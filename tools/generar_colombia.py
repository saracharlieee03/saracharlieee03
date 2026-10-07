"""
generar_colombia.py — Crea data/colombia.js: siluetas de los 33 departamentos
(ya proyectadas a SVG) y la tabla municipio -> departamento para el mapa.

Fuentes (descargarlas una vez y pasarlas como argumentos):
  1. Límites departamentales (GeoJSON, propiedad DPTO = código DANE):
     https://gist.githubusercontent.com/john-guerra/43c7656821069d00dcbc/raw/be6a6e239cd5b5b803c6e7c2ec405b793a9064dd/Colombia.geo.json
  2. DIVIPOLA del DANE (municipios), datos.gov.co:
     https://www.datos.gov.co/resource/gdxc-w37w.json?$limit=3000

Uso:
    py tools/generar_colombia.py Colombia.geo.json divipola.json

Resultado: window.GEO_COL = { w, h, inset, deptos: [{ c, n, raw, d, lx, ly }], muni: { NOMBRE: código } }
"""
import json
import math
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

# Código DANE -> (nombre para mostrar, valor en mayúsculas que se guarda en los datos)
DEPTOS = {
    "05": "Antioquia", "08": "Atlántico", "11": "Bogotá D.C.", "13": "Bolívar", "15": "Boyacá",
    "17": "Caldas", "18": "Caquetá", "19": "Cauca", "20": "Cesar", "23": "Córdoba",
    "25": "Cundinamarca", "27": "Chocó", "41": "Huila", "44": "La Guajira", "47": "Magdalena",
    "50": "Meta", "52": "Nariño", "54": "Norte de Santander", "63": "Quindío", "66": "Risaralda",
    "68": "Santander", "70": "Sucre", "73": "Tolima", "76": "Valle del Cauca", "81": "Arauca",
    "85": "Casanare", "86": "Putumayo", "88": "San Andrés y Providencia", "91": "Amazonas",
    "94": "Guainía", "95": "Guaviare", "97": "Vaupés", "99": "Vichada",
}

# Nombres que se escriben distinto en los datos y en DIVIPOLA (o son corregimientos)
ALIAS = {
    "CALI": "76", "CARTAGENA": "13", "CUCUTA": "54", "DON MATIAS": "05", "TOLU": "70", "TOLU VIEJO": "70",
    "SAN CRISTOBAL MEDELLIN": "05", "TUMACO": "52", "SAN VICENTE": "05", "MOMPOX": "13", "BUGA": "76",
    "UNION PANAMERICANA LAS ANIMAS": "27", "VILLA ROSARIO": "54", "EL CANTON DE SAN PABLO": "27",
    "ATRATO YUTO": "27", "PATIA EL BORDO": "19", "MARIQUITA": "73", "UBATE": "25", "VISTA HERMOSA": "50",
    "PURISIMA": "23", "PIENDAMO": "19", "CUASPUD": "52", "ANSERMA NUEVO": "76", "PUERTO INIRIDA": "94",
    "CURRILLO": "18", "SAN JUAN DE RIO SECO": "25", "TUTUNENGO": "27", "SAN JOSE DE PALMAR": "27",
    "EL JORDAN": "05", "GRAMOLETE": "54", "GRAMALOTE": "54", "PAEZ BELALCAZAR": "19",
}

# Nombres repetidos en varios departamentos: se decide aquí; si no está en la lista y uno de ellos
# es Antioquia, se usa Antioquia (la mayoría de estudiantes es antioqueña).
AMBIGUOS = {
    "ARMENIA": "63",  # capital del Quindío, mucho más grande que Armenia (Antioquia)
    "RIOSUCIO": "17", "FLORENCIA": "18", "BUENAVISTA": "23", "SAN ANDRES": "88", "GUAMAL": "47",
    "SALAMINA": "17", "PALESTINA": "17", "VILLANUEVA": "44", "CORDOBA": "63", "SAN MARTIN": "50",
    "BALBOA": "66", "SUCRE": "70", "SAN PEDRO": "70", "COLON": "86", "BELEN": "15", "CHIMA": "23",
    "EL TAMBO": "19", "RESTREPO": "50", "ALBAN": "25", "BOLIVAR": "19", "PUERTO RICO": "18",
    "SANTIAGO": "86", "RICAURTE": "52", "MIRAFLORES": "15", "EL PENON": "68", "PUERTO COLOMBIA": "08",
    "LA VEGA": "25", "MORALES": "19", "ALBANIA": "44", "CANDELARIA": "76", "CALAMAR": "13",
    "SAN PABLO": "13", "MOSQUERA": "25", "SANTA MARIA": "41",
}

W = 1000          # ancho del lienzo SVG (el alto sale de la proporción)
TOL = 0.9         # tolerancia de simplificación, en unidades del lienzo
INSET = (24, 24, 110, 170)  # recuadro de San Andrés: x, y, ancho, alto


def norm(s: str) -> str:
    s = unicodedata.normalize("NFD", s.upper())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return " ".join(re.sub(r"[^A-Z ]", " ", s).split())


def merc(lon, lat):
    return lon, math.degrees(math.log(math.tan(math.pi / 4 + math.radians(lat) / 2)))


def simplify(pts, tol):
    """Douglas-Peucker iterativo."""
    if len(pts) < 4:
        return pts
    keep = [False] * len(pts); keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        (x1, y1), (x2, y2) = pts[a], pts[b]
        dx, dy = x2 - x1, y2 - y1; L = math.hypot(dx, dy)
        far, idx = 0, -1
        for i in range(a + 1, b):
            # anillo cerrado (extremos iguales): se mide la distancia al punto, no a la recta
            d = abs(dy * (pts[i][0] - x1) - dx * (pts[i][1] - y1)) / L if L else math.hypot(pts[i][0] - x1, pts[i][1] - y1)
            if d > far: far, idx = d, i
        if far > tol:
            keep[idx] = True; stack += [(a, idx), (idx, b)]
    return [p for p, k in zip(pts, keep) if k]


def rings(geom):
    polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    return [r for poly in polys for r in poly]


def area(r):
    return abs(sum(r[i][0] * r[i - 1][1] - r[i - 1][0] * r[i][1] for i in range(len(r)))) / 2


def label_point(r):
    """Centroide del anillo; si cae afuera, el punto interior más centrado de una rejilla."""
    a = sum(r[i - 1][0] * r[i][1] - r[i][0] * r[i - 1][1] for i in range(len(r))) / 2 or 1e-9
    cx = sum((r[i - 1][0] + r[i][0]) * (r[i - 1][0] * r[i][1] - r[i][0] * r[i - 1][1]) for i in range(len(r))) / (6 * a)
    cy = sum((r[i - 1][1] + r[i][1]) * (r[i - 1][0] * r[i][1] - r[i][0] * r[i - 1][1]) for i in range(len(r))) / (6 * a)

    def inside(x, y):
        c = False
        for i in range(len(r)):
            (x1, y1), (x2, y2) = r[i - 1], r[i]
            if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1: c = not c
        return c

    if inside(cx, cy): return cx, cy
    xs, ys = [p[0] for p in r], [p[1] for p in r]
    best = None
    for i in range(1, 30):
        for j in range(1, 30):
            x = min(xs) + (max(xs) - min(xs)) * i / 30; y = min(ys) + (max(ys) - min(ys)) * j / 30
            if inside(x, y):
                d = (x - cx) ** 2 + (y - cy) ** 2
                if best is None or d < best[0]: best = (d, x, y)
    return (best[1], best[2]) if best else (cx, cy)


def path(rs):
    return "".join("M" + "L".join(f"{x:.1f},{y:.1f}" for x, y in r) + "Z" for r in rs)


def main(geo_path: Path, divipola_path: Path, out: Path):
    feats = json.loads(geo_path.read_text(encoding="utf-8"))["features"]
    main_feats = [f for f in feats if f["properties"]["DPTO"] != "88"]
    allpts = [merc(*p) for f in main_feats for r in rings(f["geometry"]) for p in r]
    x0, x1 = min(p[0] for p in allpts), max(p[0] for p in allpts)
    y0, y1 = min(p[1] for p in allpts), max(p[1] for p in allpts)
    k = W / (x1 - x0); H = round((y1 - y0) * k)
    to_main = lambda lon, lat: ((merc(lon, lat)[0] - x0) * k, (y1 - merc(lon, lat)[1]) * k)

    # San Andrés va en un recuadro ampliado; solo se dibuja la isla principal
    # (con Providencia, a 90 km, la isla quedaría diminuta)
    sa = next(f for f in feats if f["properties"]["DPTO"] == "88")
    sa["geometry"] = {"type": "Polygon", "coordinates": [max(rings(sa["geometry"]), key=lambda r: area([merc(*p) for p in r]))]}
    sp = [merc(*p) for r in rings(sa["geometry"]) for p in r]
    sx0, sx1, sy0, sy1 = min(p[0] for p in sp), max(p[0] for p in sp), min(p[1] for p in sp), max(p[1] for p in sp)
    ix, iy, iw, ih = INSET; pad = 16
    ks = min((iw - 2 * pad) / (sx1 - sx0), (ih - 2 * pad - 34) / (sy1 - sy0))
    ox = ix + (iw - (sx1 - sx0) * ks) / 2; oy = iy + 34 + (ih - 34 - (sy1 - sy0) * ks) / 2
    to_inset = lambda lon, lat: (ox + (merc(lon, lat)[0] - sx0) * ks, oy + (sy1 - merc(lon, lat)[1]) * ks)

    deptos = []
    for f in feats:
        c = f["properties"]["DPTO"]; proj = to_inset if c == "88" else to_main
        rs = [simplify([proj(*p) for p in r], TOL if c != "88" else 0.4) for r in rings(f["geometry"])]
        rs = [r for r in rs if len(r) >= 4 and area(r) > (0.6 if c != "88" else 0.05)]
        lx, ly = label_point(max(rs, key=area))
        name = DEPTOS[c]
        raw = "SAN ANDRÉS Y PROVIDENCIA" if c == "88" else name.upper()
        deptos.append({"c": c, "n": name, "raw": raw, "d": path(rs), "lx": round(lx, 1), "ly": round(ly, 1)})
    # Bogotá se dibuja al final para quedar encima de Cundinamarca
    deptos.sort(key=lambda d: (d["c"] == "11", d["c"]))

    by_name = defaultdict(set)
    for m in json.loads(divipola_path.read_text(encoding="utf-8")):
        by_name[norm(m["nom_mpio"])].add(m["cod_dpto"])
    muni = {}
    for name, codes in by_name.items():
        if len(codes) == 1: muni[name] = next(iter(codes))
        elif name in AMBIGUOS: muni[name] = AMBIGUOS[name]
        elif "05" in codes: muni[name] = "05"
        else: muni[name] = sorted(codes)[0]
    muni.update(ALIAS)

    data = {"w": W, "h": H, "inset": INSET, "deptos": deptos, "muni": dict(sorted(muni.items()))}
    out.write_text("/* Generado por tools/generar_colombia.py — no editar a mano */\nwindow.GEO_COL="
                   + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
    print(f"Listo: {len(deptos)} departamentos, {len(muni)} municipios, lienzo {W}x{H} -> {out} ({out.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    if len(sys.argv) < 3: sys.exit(__doc__)
    main(Path(sys.argv[1]), Path(sys.argv[2]), Path(__file__).resolve().parent.parent / "data" / "colombia.js")
