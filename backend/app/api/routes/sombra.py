"""
Endpoints para cálculo de sombras y rutas frescas.
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.core.solar_geometry import get_sun_position, calculate_shadow_length
from app.services.mdt_service import get_elevation, get_elevation_grid
from app.services.mdt_service import compute_shadow_index as _compute_shadow_index_mdt
from app.services.mds_service import compute_shadow_index as _compute_shadow_index_mds, mds_available
from app.services.routing_service import calcular_ruta_fresca as _calcular_ruta_fresca


def compute_shadow_index(lat, lon, azimuth, elevation):
    result = _compute_shadow_index_mds(lat, lon, azimuth, elevation)
    if result is not None:
        return result
    return _compute_shadow_index_mdt(lat, lon, azimuth, elevation)

router = APIRouter()


class RutaFrescaRequest(BaseModel):
    origin_lat: float
    origin_lon: float
    dest_lat: float
    dest_lon: float
    datetime_utc: Optional[str] = None
    shade_weight: float = 2.0  # 0 = ruta más corta, 2 = maximizar sombra


@router.get("/fuente-datos")
def get_fuente_datos():
    """Indica qué modelo de elevación está activo y los tamaños reales de los ficheros."""
    import os
    from app.services.mds_service import MDS_PATH, MDT_PATH
    from app.services.routing_service import GRAPH_CACHE_PATH

    def _size_mb(p) -> str:
        try:
            s = os.path.getsize(p)
            return f"{s / 1e6:.1f} MB"
        except Exception:
            return "no encontrado"

    return {
        "fuente": "MDS 2024 Valencia" if mds_available() else "MDT Valencia",
        "precision": "alta" if mds_available() else "baja",
        "ficheros": {
            "mds": {"path": str(MDS_PATH), "size": _size_mb(MDS_PATH)},
            "mdt": {"path": str(MDT_PATH), "size": _size_mb(MDT_PATH)},
            "grafo_osm": {"path": str(GRAPH_CACHE_PATH), "size": _size_mb(GRAPH_CACHE_PATH)},
        },
    }


@router.get("/sol")
def get_posicion_sol(
    lat: float = Query(39.4699),
    lon: float = Query(-0.3763),
    dt: Optional[str] = Query(None, description="Datetime ISO 8601 UTC. Si no se indica, usa la hora actual"),
):
    """Posición del sol y longitud de sombra para una coordenada de Valencia."""
    parsed_dt = datetime.fromisoformat(dt) if dt else datetime.now(timezone.utc)
    position = get_sun_position(parsed_dt, lat, lon)

    shadow_per_10m = 0.0
    if position["is_daytime"]:
        raw = calculate_shadow_length(10.0, position["elevation"])
        shadow_per_10m = min(raw, 9999)

    elev = get_elevation(lat, lon)

    return {
        **position,
        "shadow_length_per_10m": round(shadow_per_10m, 1),
        "elevacion_mdt_m": elev,
    }


@router.get("/elevacion")
def get_elevacion(
    lat: float = Query(..., description="Latitud WGS84"),
    lon: float = Query(..., description="Longitud WGS84"),
):
    """Devuelve la elevación real del MDT para un punto de Valencia."""
    elev = get_elevation(lat, lon)
    if elev is None:
        return {"error": "Punto fuera del MDT o sin datos", "lat": lat, "lon": lon}
    return {"lat": lat, "lon": lon, "elevacion_m": elev}


@router.get("/grid-elevacion")
def get_grid_elevacion(
    lat_min: float = Query(39.45),
    lon_min: float = Query(-0.40),
    lat_max: float = Query(39.48),
    lon_max: float = Query(-0.34),
    step_m: float = Query(50, ge=20, le=200, description="Separación entre puntos en metros"),
):
    """
    Devuelve cuadrícula de elevaciones del MDT dentro de un bounding box.
    Útil para visualizar el relieve en el mapa.
    """
    puntos = get_elevation_grid(lat_min, lon_min, lat_max, lon_max, step_m)
    return {"total": len(puntos), "puntos": puntos}


@router.get("/indice-sombra")
def get_indice_sombra(
    lat: float = Query(...),
    lon: float = Query(...),
    dt: Optional[str] = Query(None),
):
    """
    Índice de sombra 0-100 para un punto concreto.
    Combina: ray-casting sobre MDT + aspecto del terreno + ángulo solar.
    0 = pleno sol · 100 = en sombra.
    """
    parsed_dt = datetime.fromisoformat(dt) if dt else datetime.now(timezone.utc)
    position = get_sun_position(parsed_dt, lat, lon)

    result = compute_shadow_index(lat, lon, position["azimuth"], position["elevation"])
    return {**result, "lat": lat, "lon": lon}


@router.post("/ruta-fresca")
def calcular_ruta_fresca(request: RutaFrescaRequest):
    """
    Ruta más fresca entre dos puntos de Valencia.

    Devuelve dos rutas en GeoJSON:
    - ruta_fresca: maximiza tramos en sombra (ponderada por MDS 2023)
    - ruta_corta: distancia mínima sin considerar sombra (referencia)

    shade_weight controla cuánto se penaliza el sol:
    - 0.0 → equivale a ruta_corta
    - 2.0 → acepta hasta el doble de distancia si hay suficiente sombra
    """
    try:
        parsed_dt = (
            datetime.fromisoformat(request.datetime_utc)
            if request.datetime_utc
            else datetime.now(timezone.utc)
        )
        return _calcular_ruta_fresca(
            origin_lat=request.origin_lat,
            origin_lon=request.origin_lon,
            dest_lat=request.dest_lat,
            dest_lon=request.dest_lon,
            dt=parsed_dt,
            shade_weight=request.shade_weight,
        )
    except Exception as exc:
        return {"error": f"Error interno al calcular la ruta: {exc}"}
