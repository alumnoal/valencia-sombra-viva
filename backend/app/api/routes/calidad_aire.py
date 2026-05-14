"""
Endpoints para calidad del aire en tiempo real.
Fuente: RVVCCA (Red Valenciana de Vigilancia y Control de la Contaminación Atmosférica) — GVA.
"""

from fastapi import APIRouter
from app.services.aire_service import get_estaciones, resumen_aire

router = APIRouter()


@router.get("/tiempo-real")
def get_calidad_aire():
    """Calidad del aire de todas las estaciones de Valencia."""
    return get_estaciones()


@router.get("/resumen")
def get_resumen_aire():
    """Nivel global de calidad del aire en Valencia ahora mismo."""
    return resumen_aire()
