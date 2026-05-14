"""
Servicio de refugios climáticos para Valencia.
Carga y unifica datos de: centros de mayores, bibliotecas, fuentes de agua, centros de salud.

Fuentes (GeoJSON del Geoportal de Valencia y Open Data VLCi):
  - Equipamientos municipales: v_infociudad.json (idclase=1 → bibliotecas)
  - Recursos mayores: SS_MAYORES.json
  - Fuentes de agua pública: fuentes_agua.json (capa 158, WGS84)
  - Fuentes PUSDAR (refrigeradas): fuentes_pusdar.json
  - Hospitales y centros de salud: hospitales.json
"""

import json
import math
from functools import lru_cache
from pathlib import Path

import pandas as pd

RAW = Path(__file__).parent.parent.parent / "data" / "raw"

TIPOS_LABEL = {
    "centro_mayores": "Centro de Mayores",
    "biblioteca": "Biblioteca",
    "fuente": "Fuente de agua",
    "farmacia": "Centro de Salud",
}


# ─── Parsers genéricos para GeoJSON del Geoportal de Valencia ─────────────────

def _parse_geojson(
    path: Path,
    tipo: str,
    filtro_campo: str | None = None,
    filtro_valor=None,
) -> list[dict]:
    """
    Parser genérico para GeoJSON del Geoportal de Valencia.
    Extrae coordenadas de geometry.coordinates (WGS84) o de properties si no hay geometry.
    """
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    features = data.get("features", data if isinstance(data, list) else [])
    result = []

    for feat in features:
        if not isinstance(feat, dict):
            continue
        props = feat.get("properties") or feat
        geom = feat.get("geometry") or {}
        coords = geom.get("coordinates") or []

        # Aplicar filtro si se especifica (ej: idclase=1 para bibliotecas)
        if filtro_campo and filtro_valor is not None:
            val = props.get(filtro_campo) or props.get(filtro_campo.upper()) or props.get(filtro_campo.lower())
            # Comparar como int si ambos son numéricos
            try:
                if int(val) != int(filtro_valor):
                    continue
            except (TypeError, ValueError):
                if val != filtro_valor:
                    continue

        # Coordenadas desde geometry.coordinates [lon, lat]
        try:
            lon = float(coords[0]) if len(coords) >= 1 else None
            lat = float(coords[1]) if len(coords) >= 2 else None
        except (TypeError, ValueError):
            lon = lat = None

        # Fallback: coordenadas desde properties
        if lat is None:
            for lat_key in ("latitud", "lat", "LATITUD", "LAT", "latitude"):
                v = props.get(lat_key)
                if v is not None:
                    try:
                        lat = float(v)
                        break
                    except (TypeError, ValueError):
                        pass
        if lon is None:
            for lon_key in ("longitud", "lon", "LONGITUD", "LON", "longitude"):
                v = props.get(lon_key)
                if v is not None:
                    try:
                        lon = float(v)
                        break
                    except (TypeError, ValueError):
                        pass

        if lat is None or lon is None:
            continue

        # Nombre del establecimiento — intentar varios campos
        nombre = (
            props.get("equipamien") or props.get("EQUIPAMIEN") or
            props.get("descripcion") or props.get("DESCRIPCION") or
            props.get("nombre") or props.get("NOMBRE") or
            props.get("pusdar") or props.get("PUSDAR") or
            f"{TIPOS_LABEL.get(tipo, tipo)} {props.get('objectid') or props.get('OBJECTID') or ''}"
        )

        # Dirección
        direccion = (
            props.get("calle") or props.get("CALLE") or
            props.get("calle_asociada") or props.get("CALLE_ASOCIADA") or
            props.get("direccion") or props.get("DIRECCION") or ""
        )

        # Barrio / distrito
        distrito = (
            props.get("barrio") or props.get("BARRIO") or
            props.get("distrito") or props.get("DISTRITO") or ""
        )

        result.append({
            "id": str(
                props.get("objectid") or props.get("OBJECTID") or
                props.get("id") or props.get("ID") or ""
            ),
            "nombre": str(nombre).strip(),
            "tipo": tipo,
            "tipo_label": TIPOS_LABEL[tipo],
            "lat": round(lat, 6),
            "lon": round(lon, 6),
            "direccion": str(direccion).strip(),
            "distrito": str(distrito).strip(),
        })

    return result


# ─── Parser de fallback: JSON-LD legacy ──────────────────────────────────────

def _parse_ld_json(path: Path, tipo: str) -> list[dict]:
    """Parsea JSON-LD legacy (@graph con location.latitude/longitude)."""
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    graph = data.get("@graph", [])
    result = []
    for item in graph:
        loc = item.get("location", {})
        lat = loc.get("latitude")
        lon = loc.get("longitude")
        if lat is None or lon is None:
            continue
        addr = item.get("address", {})
        result.append({
            "id": str(item.get("id", "")),
            "nombre": item.get("title", ""),
            "tipo": tipo,
            "tipo_label": TIPOS_LABEL[tipo],
            "lat": float(lat),
            "lon": float(lon),
            "direccion": addr.get("street-address", ""),
            "distrito": _extract_distrito(addr.get("district", {}).get("@id", "")),
        })
    return result


def _extract_distrito(uri: str) -> str:
    if "/" in uri:
        return uri.split("/")[-1].replace("-", " ").title()
    return ""


def _parse_farmacias(path: Path) -> list[dict]:
    """Parsea farmacias_guardia.csv — formato CSV legacy."""
    df = pd.read_csv(path, sep=";", encoding="utf-8-sig")
    df.columns = [c.strip() for c in df.columns]
    df_unico = df.drop_duplicates(subset=["Farmacia"])
    result = []
    for _, row in df_unico.iterrows():
        result.append({
            "id": str(row.get("Farmacia", "")),
            "nombre": f"Farmacia {row.get('Farmacia', '')} – {row.get('Barrio', '')}",
            "tipo": "farmacia",
            "tipo_label": TIPOS_LABEL["farmacia"],
            "lat": None,
            "lon": None,
            "direccion": str(row.get("Direccion", "")),
            "distrito": str(row.get("Localidad", "")),
        })
    return result


# ─── Carga principal ──────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def cargar_refugios() -> list[dict]:
    """Carga todos los refugios en memoria (se llama una vez al arrancar)."""
    refugios: list[dict] = []

    # 1. Centros de mayores — Valencia: SS_MAYORES.json
    for fname, parser in [
        ("ss_mayores.json",     lambda p: _parse_geojson(p, "centro_mayores")),
        ("centros_mayores.json", lambda p: _parse_ld_json(p, "centro_mayores")),
    ]:
        path = RAW / fname
        if path.exists():
            try:
                refugios.extend(parser(path))
                break
            except Exception as e:
                print(f"[WARN] Error parseando {fname}: {e}")

    # 2. Bibliotecas — Valencia: infociudad.json (idclase=1)
    for fname, parser in [
        ("infociudad.json",  lambda p: _parse_geojson(p, "biblioteca", "idclase", 1)),
        ("bibliotecas.json", lambda p: _parse_ld_json(p, "biblioteca")),
    ]:
        path = RAW / fname
        if path.exists():
            try:
                refugios.extend(parser(path))
                break
            except Exception as e:
                print(f"[WARN] Error parseando {fname}: {e}")

    # 3. Fuentes de agua pública (capa 158 GeoJSON)
    path_fuentes = RAW / "fuentes_agua.json"
    if path_fuentes.exists():
        try:
            refugios.extend(_parse_geojson(path_fuentes, "fuente"))
        except Exception as e:
            print(f"[WARN] Error parseando fuentes_agua.json: {e}")

    # 4. Fuentes PUSDAR (agua refrigerada — 25 puntos)
    path_pusdar = RAW / "fuentes_pusdar.json"
    if path_pusdar.exists():
        try:
            refugios.extend(_parse_geojson(path_pusdar, "fuente"))
        except Exception as e:
            print(f"[WARN] Error parseando fuentes_pusdar.json: {e}")

    # 5. Hospitales / centros de salud como refugios de guardia
    for fname, parser in [
        ("hospitales.json",     lambda p: _parse_geojson(p, "farmacia")),
        ("farmacias_guardia.csv", lambda p: _parse_farmacias(p)),
    ]:
        path = RAW / fname
        if path.exists():
            try:
                refugios.extend(parser(path))
                break
            except Exception as e:
                print(f"[WARN] Error parseando {fname}: {e}")

    return refugios


# ─── Búsqueda por proximidad ─────────────────────────────────────────────────

def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6_371_000
    p = math.pi / 180
    a = (math.sin((lat2 - lat1) * p / 2) ** 2
         + math.cos(lat1 * p) * math.cos(lat2 * p)
         * math.sin((lon2 - lon1) * p / 2) ** 2)
    return 2 * R * math.asin(math.sqrt(a))


def refugios_cercanos(
    lat: float,
    lon: float,
    radio_m: float = 500,
    tipos: list[str] | None = None,
) -> list[dict]:
    """Devuelve refugios dentro de `radio_m` metros, ordenados por distancia."""
    todos = cargar_refugios()
    resultado = []
    for r in todos:
        if r["lat"] is None or r["lon"] is None:
            continue
        if tipos and r["tipo"] not in tipos:
            continue
        dist = _haversine(lat, lon, r["lat"], r["lon"])
        if dist <= radio_m:
            resultado.append({**r, "distancia_m": round(dist)})
    resultado.sort(key=lambda x: x["distancia_m"])
    return resultado
