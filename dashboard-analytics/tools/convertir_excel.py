"""
convertir_excel.py — Convierte el Excel de estudiantes en data/datos.js

Uso (desde la carpeta del proyecto, en Windows):
    py -m pip install pandas openpyxl
    py tools/convertir_excel.py datos_limpios_final.xlsx

Qué hace:
  Cada columna de texto se reemplaza por un número (su posición en una lista de
  valores únicos). Así 29.014 filas pesan poco y el navegador filtra muy rápido.
  Resultado: window.DATA = { cols, labels, dict, rows, meta }
"""
import json
import sys
from pathlib import Path

import pandas as pd

# Nombre interno  ->  nombre de la columna en el Excel
COLUMNAS = {
    "Sede": "Sede", "Facultad": "Facultad", "Area": "Area Conocimiento",
    "Programa": "Nombre Programa", "Sexo": "Sexo", "Estrato": "Id Estrato",
    "Modalidad": "Modalidad", "TipoInscripcion": "Tipo Inscripcion",
    "TipoPrograma": "Tipo Programa", "Colegio": "Colegio", "Institucion": "Institucion",
    "Pais": "Pais Nacimiento", "Ciudad": "Ciudad Nacimiento", "Comuna": "Comuna", "Barrio": "Barrio",
}


def convertir(excel: Path, salida: Path) -> None:
    df = pd.read_excel(excel)
    faltan = [c for c in COLUMNAS.values() if c not in df.columns]
    if faltan:
        sys.exit(f"Faltan columnas en el Excel: {faltan}")

    datos = df[list(COLUMNAS.values())].fillna("DESCONOCIDO").astype(str).apply(lambda s: s.str.strip())
    diccionarios = [sorted(datos[c].unique()) for c in COLUMNAS.values()]
    posiciones = [{v: i for i, v in enumerate(d)} for d in diccionarios]
    filas = [[posiciones[k][v] for k, v in enumerate(fila)] for fila in datos.itertuples(index=False)]

    ano = int(df["Ano"].iloc[0]) if "Ano" in df.columns else None
    data = {
        "cols": list(COLUMNAS.keys()), "labels": list(COLUMNAS.values()),
        "dict": diccionarios, "rows": filas,
        "meta": {"archivo": excel.name, "ano": ano, "total": len(filas)},
    }
    salida.parent.mkdir(parents=True, exist_ok=True)
    salida.write_text("window.DATA=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
    print(f"Listo: {len(filas):,} filas y {len(COLUMNAS)} columnas -> {salida}")


if __name__ == "__main__":
    excel = Path(sys.argv[1] if len(sys.argv) > 1 else "datos_limpios_final.xlsx")
    salida = Path(__file__).resolve().parent.parent / "data" / "datos.js"
    convertir(excel, salida)
