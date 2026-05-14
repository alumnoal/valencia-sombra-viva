"""
Motor de cálculo de geometría solar para Valencia.

Calcula la posición del sol (azimut y elevación) para una fecha/hora dada
y estima la longitud y dirección de sombras proyectadas por los edificios.
"""

import math
from datetime import datetime
from typing import Tuple

import pysolar.solar as solar
import pysolar.radiation as radiation


VALENCIA_LAT = 39.4699
VALENCIA_LON = -0.3763


def get_sun_position(dt: datetime, lat: float = VALENCIA_LAT, lon: float = VALENCIA_LON) -> dict:
    """
    Devuelve azimut y elevación del sol para una coordenada y momento dado.

    Args:
        dt: Datetime con timezone (UTC recomendado)
        lat: Latitud
        lon: Longitud

    Returns:
        dict con azimut (0-360, Norte=0) y elevacion (grados sobre horizonte)
    """
    altitude = solar.get_altitude(lat, lon, dt)
    azimuth = solar.get_azimuth(lat, lon, dt)

    return {
        "azimuth": float(azimuth),
        "elevation": float(altitude),
        "is_daytime": bool(altitude > 0),
    }


def calculate_shadow_length(building_height_m: float, sun_elevation_deg: float) -> float:
    """
    Calcula la longitud de la sombra proyectada por un edificio.

    Args:
        building_height_m: Altura del edificio en metros
        sun_elevation_deg: Elevación del sol en grados

    Returns:
        Longitud de la sombra en metros (0 si no hay sol)
    """
    if sun_elevation_deg <= 0:
        return float("inf")  # noche o sol bajo el horizonte

    elevation_rad = math.radians(sun_elevation_deg)
    return building_height_m / math.tan(elevation_rad)


def shadow_direction_vector(sun_azimuth_deg: float) -> Tuple[float, float]:
    """
    Devuelve el vector unitario de dirección de la sombra (opuesto al sol).

    Args:
        sun_azimuth_deg: Azimut del sol en grados (Norte=0, Este=90)

    Returns:
        Tuple (dx, dy) en coordenadas cartesianas (Este=+x, Norte=+y)
    """
    # La sombra cae en dirección opuesta al sol
    shadow_azimuth = (sun_azimuth_deg + 180) % 360
    az_rad = math.radians(shadow_azimuth)
    dx = math.sin(az_rad)
    dy = math.cos(az_rad)
    return dx, dy


def is_point_in_shadow(
    point_lat: float,
    point_lon: float,
    building_lat: float,
    building_lon: float,
    building_height_m: float,
    sun_position: dict,
    tolerance_m: float = 2.0,
) -> bool:
    """
    Estima si un punto está en sombra dado un edificio y la posición del sol.

    Versión simplificada: proyección 2D sobre plano horizontal.
    """
    if not sun_position["is_daytime"]:
        return True  # de noche, todo en "sombra"

    shadow_length = calculate_shadow_length(building_height_m, sun_position["elevation"])
    dx, dy = shadow_direction_vector(sun_position["azimuth"])

    # Convertir diferencia de coordenadas a metros (aproximación plana)
    dlat_m = (point_lat - building_lat) * 111_320
    dlon_m = (point_lon - building_lon) * 111_320 * math.cos(math.radians(building_lat))

    # Proyección del punto sobre el eje de la sombra
    projection = dlat_m * dy + dlon_m * dx
    perpendicular = abs(dlat_m * dx - dlon_m * dy)

    # El punto está en sombra si:
    # 1. Está en la dirección correcta (proyección positiva)
    # 2. Está dentro de la longitud de la sombra
    # 3. La perpendicular no supera la "anchura" del edificio (simplificado)
    in_shadow = (
        0 < projection <= shadow_length
        and perpendicular <= tolerance_m
    )
    return in_shadow
