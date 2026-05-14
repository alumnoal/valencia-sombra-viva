import asyncio
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import sombra, refugios, calidad_aire


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not os.environ.get("DISABLE_WARMUP"):
        async def _warmup():
            try:
                from app.services.routing_service import _get_graph
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(None, _get_graph)
                print("[OK] Grafo OSM listo")
            except Exception as e:
                print(f"[WARN] Grafo OSM no disponible: {e}")
        asyncio.create_task(_warmup())
    yield


_debug = os.environ.get("DEBUG", "false").lower() == "true"
app = FastAPI(
    title="Valencia Sombra Viva API",
    description="Rutas frescas y refugios climáticos para Valencia usando datos abiertos",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if _debug else None,
    redoc_url="/redoc" if _debug else None,
    openapi_url="/openapi.json" if _debug else None,
)

_origins_env = os.environ.get("ALLOWED_ORIGINS", "*")
_allow_origins = ["*"] if _origins_env == "*" else _origins_env.split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_credentials=_origins_env != "*",
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sombra.router, prefix="/api/sombra", tags=["sombra"])
app.include_router(refugios.router, prefix="/api/refugios", tags=["refugios"])
app.include_router(calidad_aire.router, prefix="/api/aire", tags=["calidad_aire"])


@app.get("/")
def root():
    return {"status": "ok", "proyecto": "Valencia Sombra Viva"}


@app.get("/health")
def health():
    hf = os.environ.get("HF_DATASET_URL", "")
    return {
        "status": "healthy",
        "rasters": "vsicurl_hf" if hf else "volumen_local",
    }
