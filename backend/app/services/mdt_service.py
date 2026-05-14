"""
Servicio de acceso al Modelo Digital del Territorio (MDT).

El MDT está en EPSG:25830 (UTM zona 30N). Convierte lat/lon (EPSG:4326)
a UTM antes de consultar la altura del píxel.
"""

import math
import os
from datetime import datetime
from functools import lru_cache
from pathlib import Path

from pyproj import Transformer


def _data_root() -> Path:
    d = os.environ.get("DATA_DIR", "")
    return Path(d) if d else Path(__file__).parent.parent.parent.parent / "data"


MDT_PATH = _data_root() / "raw" / "mdt" / "MDT_Valencia_2m.tif"
_HF_BASE = os.environ.get("HF_DATASET_URL", "").rstrip("/")

_transformer = Transformer.from_crs("EPSG:4326", "EPSG:25830", always_xy=True)
_inv_transformer = Transformer.from_crs("EPSG:25830", "EPSG:4326", always_xy=True)


@lru_cache(maxsize=1)
def _get_dataset():
    import rasterio
    if _HF_BASE:
        try:
            return rasterio.open(f"/vsicurl/{_HF_BASE}/MDT_Valencia_2m.tif")
        except Exception as e:
            print(f"[WARN] MDT vsicurl: {e}")
    if MDT_PATH.exists():
        return rasterio.open(MDT_PATH)
    return None


def _read_elevation_utm(x: float, y: float) -> float | None:
    import rasterio.windows
    src = _get_dataset()
    if src is None:
        return None
    try:
        row, col = src.index(x, y)
    except Exception:
        return None
    if row < 0 or col < 0 or row >= src.height or col >= src.width:
        return None
    try:
        window = rasterio.windows.Window(col, row, 1, 1)
        data = src.read(1, window=window)
        value = float(data[0, 0])
    except Exception:
        return None
    if value >= src.nodata * 0.99:
        return None
    return value


def get_elevation(lat: float, lon: float) -> float | None:
    x, y = _transformer.transform(lon, lat)
    v = _read_elevation_utm(x, y)
    return round(v, 2) if v is not None else None


def compute_shadow_index(lat: float, lon: float, sun_azimuth: float, sun_elevation: float) -> dict:
    """
    Calcula el índice de sombra (0-100) para un punto usando el MDT.

    Combina:
    1. Ángulo solar: sol bajo = sombras largas = más zonas en sombra (efecto dominante)
    2. Aspecto del terreno: si el terreno se orienta opuesto al sol, hay más sombra
    3. Ray-casting básico: mira si el terreno en dirección al sol bloquea la luz

    Resultado: 0 = pleno sol, 100 = en sombra
    """
    if sun_elevation <= 0:
        return {"indice_sombra": 100.0, "motivo": "noche_o_ocaso"}

    x0, y0 = _transformer.transform(lon, lat)
    base_elev = _read_elevation_utm(x0, y0)
    if base_elev is None:
        return {"indice_sombra": 0.0, "motivo": "sin_datos_mdt"}

    az_rad = math.radians(sun_azimuth)
    # UTM: X = Este, Y = Norte
    ray_dx = math.sin(az_rad)   # componente Este
    ray_dy = math.cos(az_rad)   # componente Norte
    el_rad = math.radians(sun_elevation)
    tan_el = math.tan(el_rad)

    # --- Ray casting hacia el sol (terreno bloquea la luz?) ---
    blocked = False
    max_dist_m = 150
    step_m = 10
    for dist in range(step_m, max_dist_m + 1, step_m):
        sx = x0 + ray_dx * dist
        sy = y0 + ray_dy * dist
        sample_elev = _read_elevation_utm(sx, sy)
        if sample_elev is None:
            continue
        # Altura del rayo solar a esta distancia
        ray_height = base_elev + dist * tan_el
        if sample_elev > ray_height + 1.0:   # +1m de tolerancia
            blocked = True
            break

    if blocked:
        return {
            "indice_sombra": 100.0,
            "elevacion_m": round(base_elev, 1),
            "motivo": "terreno_bloquea_sol",
            "elevacion_solar_deg": round(sun_elevation, 1),
            "azimut_solar_deg": round(sun_azimuth, 1),
        }

    # --- Aspecto del terreno (varía por ubicación) ---
    d = 15.0  # metros de offset en UTM
    e = _read_elevation_utm(x0 + d, y0)
    w = _read_elevation_utm(x0 - d, y0)
    n = _read_elevation_utm(x0, y0 + d)
    s = _read_elevation_utm(x0, y0 - d)

    terrain_shade = 0.0
    if all(v is not None for v in [e, w, n, s]):
        # Gradiente en la dirección del sol (m/m)
        grad_sun = ((e - w) / (2 * d)) * ray_dx + ((n - s) / (2 * d)) * ray_dy
        # Gradiente negativo → terreno desciende hacia el sol → cara orientada opuesta → más sombra
        terrain_shade = max(0.0, min(1.0, -grad_sun * 8))

    # --- Componente solar (varía por hora) ---
    # Sol a 0° = máxima sombra posible; sol a 65°+ = mínima
    solar_shade = max(0.0, min(1.0, 1.0 - (sun_elevation / 60.0)))

    # Combinar: 65% solar, 35% terreno (el terreno da variación por ubicación)
    indice = round((solar_shade * 0.65 + terrain_shade * 0.35) * 100, 1)

    return {
        "indice_sombra": indice,
        "elevacion_m": round(base_elev, 1),
        "motivo": "calculado",
        "elevacion_solar_deg": round(sun_elevation, 1),
        "azimut_solar_deg": round(sun_azimuth, 1),
    }


def get_elevation_grid(
    lat_min: float,
    lon_min: float,
    lat_max: float,
    lon_max: float,
    step_m: float = 20.0,
) -> list[dict]:
    import numpy as np
    src = _get_dataset()
    if src is None:
        return []
    x_min, y_min = _transformer.transform(lon_min, lat_min)
    x_max, y_max = _transformer.transform(lon_max, lat_max)

    xs = np.arange(x_min, x_max, step_m)
    ys = np.arange(y_min, y_max, step_m)

    results = []
    for x in xs:
        for y in ys:
            v = _read_elevation_utm(x, y)
            if v is None:
                continue
            lon_r, lat_r = _inv_transformer.transform(x, y)
            results.append({"lat": round(lat_r, 6), "lon": round(lon_r, 6), "elev": round(v, 1)})

    return results
