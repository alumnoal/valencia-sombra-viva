"""
Servicio del Padrón Municipal de Valencia.
Calcula concentración de mayores >65 para priorizar refugios en alertas de calor.

Fuente: padron_manzanas.json — Manzanas catastrales con población por tramos de edad
  (0-14, 15-65, >66 y total) del Geoportal de Valencia.
  Descarga: https://geoportal.valencia.es/apps/OpenData/UrbanismoEInfraestructuras/MANZANAS.json
"""

import json
from functools import lru_cache
from pathlib import Path

import pandas as pd

RAW = Path(__file__).parent.parent.parent.parent / "data" / "raw"
EDAD_MAYOR = 65


def _detectar_col_mayores(df: pd.DataFrame) -> str | None:
    """Detecta el nombre de columna que contiene población >65/66."""
    candidatos = [
        "P_66_YMAS", "p_66_ymas", "E_66MAS", "e_66mas",
        "MAYORES", "mayores", "P_66", "p_66",
        "EDAD_66", "edad_66", "POB_66MAS",
    ]
    for col in candidatos:
        if col in df.columns:
            return col
    # Búsqueda más amplia: cualquier columna que contenga "66"
    for col in df.columns:
        if "66" in col.upper():
            return col
    return None


def _detectar_col_total(df: pd.DataFrame) -> str | None:
    """Detecta el nombre de columna con la población total."""
    candidatos = [
        "P_TOTAL", "p_total", "TOTAL", "total",
        "POB_TOTAL", "pob_total", "POBLACION", "poblacion",
    ]
    for col in candidatos:
        if col in df.columns:
            return col
    return None


@lru_cache(maxsize=1)
def cargar_padron() -> pd.DataFrame:
    """Carga el padrón desde el GeoJSON de manzanas o CSV (formato heredado)."""
    # Intento 1: GeoJSON de manzanas (formato Valencia)
    path_json = RAW / "padron_manzanas.json"
    if path_json.exists():
        try:
            with open(path_json, "r", encoding="utf-8") as f:
                data = json.load(f)
            features = data.get("features", [])
            rows = [feat.get("properties", {}) for feat in features if isinstance(feat, dict)]
            if rows:
                df = pd.DataFrame(rows)
                return df
        except Exception as e:
            print(f"[WARN] padron_manzanas.json no se pudo parsear: {e}")

    # Intento 2: CSV formato legacy
    path_csv = RAW / "padron_barrios.csv"
    if path_csv.exists():
        try:
            df = pd.read_csv(path_csv, sep=";", encoding="utf-8-sig")
            df.columns = [c.strip() for c in df.columns]
            if "COD_EDAD_INT" in df.columns:
                df["COD_EDAD_INT"] = pd.to_numeric(df["COD_EDAD_INT"], errors="coerce")
                return df
        except Exception as e:
            print(f"[WARN] padron_barrios.csv no se pudo parsear: {e}")

    return pd.DataFrame()


def mayores_por_distrito() -> dict[str, dict]:
    """
    Devuelve {cod_distrito: {desc, total_mayores, total_poblacion, pct_mayores}}.
    Para Valencia con MANZANAS.json devuelve una única entrada 'ciudad' con el total.
    """
    try:
        df = cargar_padron()
        if df.empty:
            return {}

        # Formato CSV legacy (COD_EDAD_INT, COD_DISTRITO, DESC_DISTRITO)
        if all(c in df.columns for c in ("COD_EDAD_INT", "COD_DISTRITO", "DESC_DISTRITO")):
            df["total"] = sum(
                pd.to_numeric(df.get(c, 0), errors="coerce").fillna(0)
                for c in ("ESPANOLESHOMBRES", "ESPANOLESMUJERES", "EXTRANJEROSHOMBRES", "EXTRANJEROSMUJERES")
            )
            df_mayores = df[df["COD_EDAD_INT"] >= EDAD_MAYOR].copy()
            por_distrito = (
                df.groupby(["COD_DISTRITO", "DESC_DISTRITO"])["total"].sum()
                .reset_index().rename(columns={"total": "total_poblacion"})
            )
            mayores_agg = (
                df_mayores.groupby("COD_DISTRITO")["total"].sum()
                .reset_index().rename(columns={"total": "total_mayores"})
            )
            merged = por_distrito.merge(mayores_agg, on="COD_DISTRITO", how="left").fillna(0)
            merged["pct_mayores"] = (merged["total_mayores"] / merged["total_poblacion"] * 100).round(1)
            return {
                str(int(row["COD_DISTRITO"])): {
                    "desc": row["DESC_DISTRITO"].strip(),
                    "total_mayores": int(row["total_mayores"]),
                    "total_poblacion": int(row["total_poblacion"]),
                    "pct_mayores": float(row["pct_mayores"]),
                }
                for _, row in merged.iterrows()
            }

        # Formato Valencia MANZANAS (columnas p_66_ymas o similar)
        col_mayores = _detectar_col_mayores(df)
        col_total = _detectar_col_total(df)
        if col_mayores:
            total_mayores = int(pd.to_numeric(df[col_mayores], errors="coerce").fillna(0).sum())
            total_pob = int(pd.to_numeric(df[col_total], errors="coerce").fillna(0).sum()) if col_total else 0
            pct = round(total_mayores / total_pob * 100, 1) if total_pob > 0 else 0.0
            return {
                "valencia": {
                    "desc": "Valencia",
                    "total_mayores": total_mayores,
                    "total_poblacion": total_pob,
                    "pct_mayores": pct,
                }
            }

    except Exception as e:
        print(f"[WARN] Error en mayores_por_distrito: {e}")

    return {}


def score_vulnerabilidad_distrito(cod_distrito: str) -> float:
    """
    Score de vulnerabilidad 0-100 para un distrito basado en % de mayores.
    Se usa para priorizar refugios cuando hay alerta de calor.
    """
    try:
        data = mayores_por_distrito()
        if not data:
            return 50.0  # valor neutro si no hay datos
        d = data.get(str(cod_distrito))
        if not d:
            return 50.0
        max_pct = max(v["pct_mayores"] for v in data.values()) or 1
        return round(d["pct_mayores"] / max_pct * 100, 1)
    except Exception:
        return 50.0
