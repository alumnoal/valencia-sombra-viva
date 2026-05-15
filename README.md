# Valencia Sombra Viva

**Rutas frescas y refugios climáticos para Valencia · Premios Datos Abiertos Valencia 2026**

Autor: Ricardo González Alonso — Universidad Carlos III de Madrid (100454280@alumnos.uc3m.es)

---

## ¿Qué hace?

Calcula la **ruta peatonal más fresca** entre dos puntos de Valencia en función de la hora del día, usando sombras proyectadas por edificios mediante ray-casting sobre el Modelo Digital de Superficies (MDS 2m del CNIG/IGN).

Cuando la calidad del aire es mala o hay alerta de calor, activa automáticamente un mapa de **refugios climáticos** (centros de mayores, bibliotecas, fuentes PUSDAR, hospitales) priorizados por concentración de población mayor de 65 años.

## Funcionalidades

- **Modo Sombra**: clic en el mapa → índice de sombra 0-100 + calidad del aire en tiempo real (RVVCCA)
- **Modo Ruta fresca**: origen → destino → ruta ponderada por sombra vs ruta más corta
- **Modo Refugios**: mapa de refugios climáticos en 1 km del punto seleccionado

## Stack técnico

| Capa | Tecnología |
|---|---|
| Backend | Python 3.12 · FastAPI · osmnx · rasterio · PySolar |
| Frontend | React 18 · Vite · Leaflet.js |
| Datos raster | CNIG MDS02 2m EPSG:25830 (COG en HuggingFace) |
| Hosting | Render (backend Docker) · Vercel (frontend) |

## Fuentes de datos abiertos

| Dataset | Fuente | Uso |
|---|---|---|
| MDS02 2m (hojas 0724/0747) | CNIG Centro de Descargas | Sombras de edificios |
| Calidad del aire RVVCCA | Geoportal Valencia (capa 156) | Índice de contaminación |
| Recursos sociales mayores | Geoportal Valencia `SS_MAYORES.json` | Refugios climáticos |
| Equipamientos municipales | Geoportal Valencia `v_infociudad.json` | Bibliotecas como refugio |
| Fuentes de agua pública | Geoportal Valencia (capa 158) | Puntos de hidratación |
| Fuentes PUSDAR (refrigeradas) | Open Data VLCi | 25 fuentes de agua fría |
| Hospitales y centros de salud | Open Data VLCi | Refugios de guardia |
| Padrón por manzana catastral | Geoportal Valencia `MANZANAS.json` | Vulnerabilidad por edad |

## Zona cubierta

Centro urbano de Valencia: **lat 39.445–39.495 · lon -0.400–-0.340**
(centro histórico, Eixample, Ruzafa, Benimaclet, El Carmen, Cabanyal parcial)

## Desarrollo local

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

Variables de entorno necesarias (ver `backend/.env.example`):
- `HF_DATASET_URL`: URL base del dataset HuggingFace con los rasters y grafo OSM
- `ALLOWED_ORIGINS`: origins permitidos para CORS

## Despliegue

- **Backend**: `render.yaml` configurado para Docker en Render.com
- **Frontend**: `vercel.json` en `frontend/` para Vercel

## Licencia de datos

Los datos del Ayuntamiento de Valencia se publican bajo licencia **Creative Commons Attribution 4.0**.
Los datos del CNIG (MDS/MDT) se publican bajo **Licencia de uso de la Infraestructura de Datos Espaciales de España (IDEE)**.
