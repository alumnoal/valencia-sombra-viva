"""
Endpoints para refugios climáticos.
"""

from fastapi import APIRouter, Query
from typing import Optional

from app.services.refugios_service import refugios_cercanos, cargar_refugios
from app.services.padron_service import mayores_por_distrito
from app.core.config import settings

router = APIRouter()


@router.get("/cercanos")
def get_refugios_cercanos(
    lat: float = Query(..., description="Latitud de referencia"),
    lon: float = Query(..., description="Longitud de referencia"),
    radio_m: float = Query(500, description="Radio de búsqueda en metros"),
    tipos: Optional[str] = Query(None, description="Filtro: biblioteca,fuente,farmacia,centro_mayores"),
):
    """Refugios climáticos más cercanos a una coordenada."""
    tipos_list = tipos.split(",") if tipos else None
    return refugios_cercanos(lat, lon, radio_m, tipos_list)


@router.get("/alerta-calor")
def get_refugios_alerta(
    lat: float = Query(40.4168),
    lon: float = Query(-3.7038),
    radio_m: float = Query(1000),
):
    """
    Refugios activos durante alerta de calor, priorizados por vulnerabilidad
    (% mayores >65 por distrito según Padrón Municipal).
    """
    from app.services.aire_service import resumen_aire
    resumen = resumen_aire()
    alerta = resumen["nivel_global"] in ("malo",)

    todos = refugios_cercanos(lat, lon, radio_m, tipos=["centro_mayores", "biblioteca", "fuente"])
    vulnerabilidad = mayores_por_distrito()

    # Enriquecer con score de vulnerabilidad del distrito
    for r in todos:
        distrito_key = _normalizar_distrito_key(r.get("distrito", ""), vulnerabilidad)
        info = vulnerabilidad.get(distrito_key, {})
        r["pct_mayores_zona"] = info.get("pct_mayores", 0)
        r["score_prioridad"] = round(info.get("pct_mayores", 0), 1)

    # Ordenar: fuentes primero (siempre abiertas), luego por proximidad
    todos.sort(key=lambda x: (x["tipo"] != "fuente", x["distancia_m"]))

    return {
        "alerta_activa": alerta,
        "nivel_aire": resumen["nivel_global"],
        "umbral": settings.heat_alert_threshold,
        "total_refugios": len(todos),
        "refugios": todos[:20],
    }


@router.get("/stats")
def get_stats():
    """Estadísticas del conjunto de refugios cargados."""
    todos = cargar_refugios()
    por_tipo = {}
    for r in todos:
        por_tipo[r["tipo"]] = por_tipo.get(r["tipo"], 0) + 1
    con_coords = sum(1 for r in todos if r["lat"] is not None)
    return {
        "total": len(todos),
        "con_coordenadas": con_coords,
        "por_tipo": por_tipo,
    }


def _normalizar_distrito_key(nombre: str, vulnerabilidad: dict) -> str:
    """Intenta mapear el nombre de distrito a la clave numérica del Padrón."""
    nombre_norm = nombre.lower().strip()
    for k, v in vulnerabilidad.items():
        if v["desc"].lower().strip() == nombre_norm:
            return k
    return ""
