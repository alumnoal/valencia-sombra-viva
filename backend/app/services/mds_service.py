"""
Servicio de acceso al Modelo Digital de Superficies (MDS) 2023.

El MDS incluye edificios y vegetación sobre el terreno (a diferencia del MDT,
que solo captura el suelo). Esto permite ray-casting real de sombras de edificios.

CRS: EPSG:25830 (UTM zona 30N), igual que el MDT.
"""

import math
import os
from functools import lru_cache
from pathlib import Path

from pyproj import Transformer


def _data_root() -> Path:
    d = os.environ.get("DATA_DIR", "")
    return Path(d) if d else Path(__file__).parent.parent.parent.parent / "data"


_DATA_ROOT = _data_root()
MDS_PATH = _DATA_ROOT / "raw" / "mds" / "MDS_Valencia_2m.tif"
MDT_PATH = _DATA_ROOT / "raw" / "mdt" / "MDT_Valencia_2m.tif"

_HF_BASE = os.environ.get("HF_DATASET_URL", "").rstrip("/")


def _vsicurl(filename: str) -> str | None:
    """Devuelve ruta /vsicurl/ para leer el raster desde HF sin descargarlo."""
    return f"/vsicurl/{_HF_BASE}/{filename}" if _HF_BASE else None

_transformer = Transformer.from_crs("EPSG:4326", "EPSG:25830", always_xy=True)
_inv_transformer = Transformer.from_crs("EPSG:25830", "EPSG:4326", always_xy=True)

# Offsets (dx, dy) en metros para muestrear 8 puntos alrededor del punto central
# (los 4 cardinales + 4 diagonales a 4m de radio)
_SAMPLE_OFFSETS = [
    (0.0,  4.0), ( 2.8,  2.8), ( 4.0,  0.0), ( 2.8, -2.8),
    (0.0, -4.0), (-2.8, -2.8), (-4.0,  0.0), (-2.8,  2.8),
]


@lru_cache(maxsize=1)
def _get_mds():
    import rasterio
    url = _vsicurl("MDS_Valencia_2m.tif")
    if url:
        try:
            return rasterio.open(url)
        except Exception as e:
            print(f"[WARN] MDS vsicurl: {e}")
    if MDS_PATH.exists():
        return rasterio.open(MDS_PATH)
    return None


@lru_cache(maxsize=1)
def _get_mdt():
    import rasterio
    url = _vsicurl("MDT_Valencia_2m.tif")
    if url:
        try:
            return rasterio.open(url)
        except Exception as e:
            print(f"[WARN] MDT vsicurl: {e}")
    if MDT_PATH.exists():
        return rasterio.open(MDT_PATH)
    return None


def _read_raster_utm(src, x: float, y: float) -> float | None:
    import rasterio.windows
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
    nodata = src.nodata
    if nodata is not None and abs(value - nodata) < abs(nodata) * 0.01 + 1.0:
        return None
    return value


def _is_point_blocked(mds, x0: float, y0: float, base_elev: float,
                       ray_dx: float, ray_dy: float, tan_el: float) -> bool:
    """Ray-casting desde (x0, y0) hacia el sol. True si algún obstáculo bloquea."""
    step_m = 5
    max_dist_m = 200
    for dist in range(step_m, max_dist_m + 1, step_m):
        sx = x0 + ray_dx * dist
        sy = y0 + ray_dy * dist
        sample = _read_raster_utm(mds, sx, sy)
        if sample is None:
            continue
        ray_height = base_elev + dist * tan_el
        if sample > ray_height + 0.5:
            return True
    return False


def mds_available() -> bool:
    return bool(_HF_BASE) or MDS_PATH.exists()


def get_surface_elevation(lat: float, lon: float) -> float | None:
    """Elevación de la superficie (incluye edificios) en metros."""
    src = _get_mds()
    if src is None:
        return None
    x, y = _transformer.transform(lon, lat)
    v = _read_raster_utm(src, x, y)
    return round(v, 2) if v is not None else None


def get_building_height(lat: float, lon: float) -> float | None:
    """
    Altura del obstáculo sobre el suelo (MDS - MDT = nDSM).
    Devuelve 0.0 si no hay edificio (suelo libre).
    """
    mds = _get_mds()
    mdt = _get_mdt()
    if mds is None or mdt is None:
        return None
    x, y = _transformer.transform(lon, lat)
    surface = _read_raster_utm(mds, x, y)
    terrain = _read_raster_utm(mdt, x, y)
    if surface is None or terrain is None:
        return None
    return round(max(0.0, surface - terrain), 2)


def compute_shadow_index(lat: float, lon: float, sun_azimuth: float, sun_elevation: float) -> dict:
    """
    Índice de sombra (0-100) usando ray-casting multi-punto sobre el MDS.

    Se lanzan 9 rayos: el punto central + 8 puntos satélite a 4m de radio.
    La fracción de puntos bloqueados × 100 da el índice, con lo que:
    - Pleno sol = 0
    - Borde de sombra (esquina de edificio, zona parcial) = 11–89
    - Plena sombra = 100

    Devuelve None si el MDS no está disponible.
    """
    mds = _get_mds()
    if mds is None:
        return None

    if sun_elevation <= 0:
        return {"indice_sombra": 100.0, "motivo": "noche_o_ocaso", "fuente": "mds"}

    mdt = _get_mdt()
    az_rad = math.radians(sun_azimuth)
    ray_dx = math.sin(az_rad)
    ray_dy = math.cos(az_rad)
    tan_el = math.tan(math.radians(sun_elevation))

    x0, y0 = _transformer.transform(lon, lat)
    base_surface = _read_raster_utm(mds, x0, y0)
    if base_surface is None:
        return {"indice_sombra": 0.0, "motivo": "sin_datos_mds", "fuente": "mds"}

    base_terrain = _read_raster_utm(mdt, x0, y0) if mdt else None
    base_elev = base_terrain if base_terrain is not None else base_surface

    # --- Muestra central ---
    samples = [_is_point_blocked(mds, x0, y0, base_elev, ray_dx, ray_dy, tan_el)]

    # --- 8 puntos satélite ---
    for dx, dy in _SAMPLE_OFFSETS:
        sx, sy = x0 + dx, y0 + dy
        s_surface = _read_raster_utm(mds, sx, sy)
        if s_surface is None:
            continue
        s_terrain = _read_raster_utm(mdt, sx, sy) if mdt else None
        s_elev = s_terrain if s_terrain is not None else s_surface
        samples.append(_is_point_blocked(mds, sx, sy, s_elev, ray_dx, ray_dy, tan_el))

    blocked_count = sum(samples)
    indice = round(blocked_count / len(samples) * 100, 1)

    return {
        "indice_sombra": indice,
        "muestras_bloqueadas": blocked_count,
        "muestras_total": len(samples),
        "elevacion_superficie_m": round(base_surface, 1),
        "elevacion_solar_deg": round(sun_elevation, 1),
        "azimut_solar_deg": round(sun_azimuth, 1),
        "fuente": "mds",
    }
