"""
Servicio de calidad del aire.
Consume el GeoJSON en tiempo real del Geoportal de Valencia (RVVCCA).

Fuente: Capa 156 del servicio OPENDATA/MedioAmbiente — Geoportal de Valencia
URL: https://geoportal.valencia.es/server/rest/services/OPENDATA/MedioAmbiente/MapServer/156

Las 11 estaciones RVVCCA del municipio de Valencia devuelven propiedades con
valores de contaminantes (NO2, PM10, O3, SO2, CO) y coordenadas WGS84 en geometry.

Magnitudes y límites OMS:
  NO2  → 200 µg/m³ alerta hora  (OMS: 25 µg/m³ media 24h)
  PM10 → 100 µg/m³ umbral malo  (OMS: 45 µg/m³ media 24h)
  O3   → 180 µg/m³ alerta hora  (OMS: 100 µg/m³ media 8h)
  SO2  → 350 µg/m³ alerta hora
"""

import json
import os
from datetime import datetime, timezone
from pathlib import Path

import httpx

RAW = Path(__file__).parent.parent.parent.parent / "data" / "raw"

# URL del GeoJSON en tiempo real del Geoportal de Valencia (RVVCCA)
# Se puede sobreescribir con la variable de entorno AIRE_CSV_URL (nombre heredado)
_AIRE_URL = os.environ.get(
    "AIRE_CSV_URL",
    "https://geoportal.valencia.es/server/rest/services/OPENDATA/MedioAmbiente/MapServer/156/query?where=1=1&outFields=*&outSR=4326&f=geojson",
)

LIMITES_MALO: dict[str, float] = {
    "no2": 200,
    "pm10": 100,
    "o3": 180,
    "so2": 350,
    "pm25": 75,
    "co": 10,
}
LIMITES_RAZONABLE: dict[str, float] = {
    "no2": 100,
    "pm10": 50,
    "o3": 120,
    "so2": 100,
    "pm25": 35,
    "co": 5,
}


def _indice(valores: dict[str, float | None]) -> str:
    for contaminante, limite in LIMITES_MALO.items():
        v = valores.get(contaminante)
        if v is not None and v > limite:
            return "malo"
    for contaminante, limite in LIMITES_RAZONABLE.items():
        v = valores.get(contaminante)
        if v is not None and v > limite:
            return "razonable"
    return "bueno"


def _prop_float(props: dict, *keys) -> float | None:
    """Lee un valor numérico de properties probando variantes de nombre."""
    for k in keys:
        for variant in (k, k.upper(), k.lower()):
            v = props.get(variant)
            if v is not None:
                try:
                    return float(v)
                except (ValueError, TypeError):
                    pass
    return None


_aire_cache: tuple[float, list] | None = None
_AIRE_TTL = 3600  # refrescar cada hora


def _cargar_features() -> list[dict]:
    """Devuelve lista de features GeoJSON con datos de estaciones. Con caché de 1h."""
    global _aire_cache
    import time
    now = time.time()
    if _aire_cache is not None and now - _aire_cache[0] < _AIRE_TTL:
        return _aire_cache[1]

    local = RAW / "calidad_aire_tiempo_real.json"

    try:
        resp = httpx.get(_AIRE_URL, timeout=15, follow_redirects=True)
        resp.raise_for_status()
        data = resp.json()
        features = data.get("features", [])
        try:
            local.parent.mkdir(parents=True, exist_ok=True)
            local.write_text(resp.text, encoding="utf-8")
        except Exception:
            pass
        _aire_cache = (now, features)
        return features
    except Exception as exc:
        print(f"[WARN] No se pudo cargar GeoJSON de aire: {exc}")

    # Fallback: fichero local descargado previamente
    if local.exists():
        try:
            data = json.loads(local.read_text(encoding="utf-8"))
            features = data.get("features", [])
            _aire_cache = (now, features)
            return features
        except Exception:
            pass

    _aire_cache = (now, [])
    return []


def get_estaciones() -> list[dict]:
    """
    Devuelve lectura más reciente de cada estación RVVCCA con contaminantes principales.
    """
    features = _cargar_features()
    resultado = []

    for feat in features:
        if not isinstance(feat, dict):
            continue
        props = feat.get("properties") or {}
        geom = feat.get("geometry") or {}
        coords = geom.get("coordinates") or []

        # Coordenadas desde geometry (WGS84, outSR=4326)
        try:
            lon = float(coords[0]) if len(coords) >= 1 else None
            lat = float(coords[1]) if len(coords) >= 2 else None
        except (TypeError, ValueError):
            lon = lat = None

        # Fallback: coordenadas desde properties
        if lat is None:
            lat = _prop_float(props, "latitud", "lat", "latitude", "Y")
            lon = _prop_float(props, "longitud", "lon", "longitude", "X")

        if lat is None or lon is None:
            continue

        # Identificador y nombre de la estación
        codigo = (
            props.get("CODIGOINST") or props.get("codigoinst") or
            props.get("CODIGO_ESTACION") or props.get("codigo_estacion") or
            str(props.get("OBJECTID") or props.get("objectid") or "")
        )
        nombre = (
            props.get("NOMBRE") or props.get("nombre") or
            props.get("ESTACION") or props.get("estacion") or
            f"Estación {codigo}"
        )
        tipo_zona = props.get("TIPO_ZONA") or props.get("tipo_zona") or ""

        valores = {
            "no2":  _prop_float(props, "NO2", "no2"),
            "pm10": _prop_float(props, "PM10", "pm10"),
            "pm25": _prop_float(props, "PM2_5", "PM25", "pm25", "PM2.5"),
            "o3":   _prop_float(props, "O3", "o3"),
            "so2":  _prop_float(props, "SO2", "so2"),
            "co":   _prop_float(props, "CO", "co"),
        }

        estacion = {
            "id": str(codigo),
            "nombre": str(nombre),
            "distrito": str(tipo_zona),
            "lat": round(lat, 6),
            "lon": round(lon, 6),
            "no2":  valores["no2"],
            "pm10": valores["pm10"],
            "o3":   valores["o3"],
            "so2":  valores["so2"],
        }
        estacion["indice_calidad"] = _indice(valores)
        resultado.append(estacion)

    return resultado


def resumen_aire() -> dict:
    """Nivel global y número de estaciones en alerta."""
    estaciones = get_estaciones()
    malos = [e for e in estaciones if e["indice_calidad"] == "malo"]
    razonables = [e for e in estaciones if e["indice_calidad"] == "razonable"]

    if malos:
        nivel = "malo"
        peor = malos[0]
    elif razonables:
        nivel = "razonable"
        peor = razonables[0]
    else:
        nivel = "bueno"
        peor = None

    return {
        "nivel_global": nivel,
        "estaciones_en_alerta": len(malos),
        "peor_zona": peor["nombre"] if peor else None,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "fuente": "geoportal.valencia.es (RVVCCA)",
    }
