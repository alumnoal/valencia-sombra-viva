# Arquitectura — Valencia Sombra Viva

## Visión general (producción)

```
┌─────────────────────────────────┐
│   Frontend React + Leaflet      │
│   Vercel (CDN global)           │
│   valencia-sombra-viva.vercel.app│
└────────────────┬────────────────┘
                 │ HTTPS /api/*
┌────────────────▼────────────────┐
│   Backend FastAPI               │
│   Render (Frankfurt, free tier) │
│   valencia-sombra-viva-api.     │
│   onrender.com                  │
└──────┬──────────────────┬───────┘
       │                  │
┌──────▼──────┐  ┌────────▼────────────────┐
│  RVVCCA GVA │  │  HuggingFace Datasets   │
│  tiempo real│  │  MDS_Valencia_2m.tif    │
│  (aire)     │  │  MDT_Valencia_2m.tif   │
└─────────────┘  │  osm_walk_graph_25830   │
                 └─────────────────────────┘
```

## Módulos principales

### Motor de Sombras (`backend/app/services/mds_service.py`)
- Ray-casting real sobre el MDS (Modelo Digital de Superficies — incluye edificios)
- 9 muestras por punto (centro + 8 satélites a 4 m de radio) → índice de sombra 0-100
- Lee el raster vía `/vsicurl/` desde HuggingFace sin descargarlo completo

### Routing de Rutas Frescas (`backend/app/services/routing_service.py`)
- Grafo peatonal OSM del área urbana central de Valencia (centro histórico, Eixample, Ruzafa, Benimaclet)
- Carga el grafo desde HuggingFace en el primer arranque (~50 MB pickle)
- Ruta corta (Dijkstra por longitud) + ruta fresca (Dijkstra ponderado por sombra)
- Corredor: subgrafo bbox(ruta corta) + 400 m buffer → ~200-600 edges por cálculo

### API de Refugios (`backend/app/api/routes/refugios.py`)
- Bibliotecas, centros de mayores, fuentes, farmacias de guardia
- Priorización por concentración de mayores >65 (Padrón municipal de Valencia)
- Activación automática si temperatura supera 35°C

### API de Calidad del Aire (`backend/app/api/routes/calidad_aire.py`)
- Consume el endpoint en tiempo real de la RVVCCA (GVA / Generalitat Valenciana)
- Cache de 1 hora para no saturar la fuente

## Flujo de datos en producción

1. Al arrancar, el backend descarga el grafo OSM desde HuggingFace → `/tmp/` (una vez por instancia)
2. Los rasters MDS/MDT se leen pixel a pixel vía vsicurl bajo demanda (sin descarga completa)
3. El frontend solicita ruta/refugios/sombra → API calcula → devuelve GeoJSON → Leaflet renderiza
4. Los datos de calidad del aire se obtienen en tiempo real de la RVVCCA (dadesobertes.gva.es)

## Zona cubierta para rutas

El grafo OSM cubre el **área urbana central de Valencia** (centro histórico, Eixample, Ruzafa, Benimaclet):
- Latitud: 39.445 – 39.495
- Longitud: -0.400 – -0.340

## Datasets y fuentes

| Dataset | Fuente | Uso |
|---|---|---|
| MDS (1m resolución) | ICV (Institut Cartogràfic Valencià) | Ray-casting de sombras |
| MDT | ICV (Institut Cartogràfic Valencià) | Elevación del terreno |
| Grafo peatonal OSM | OpenStreetMap vía osmnx | Routing |
| Calidad del aire | RVVCCA / dadesobertes.gva.es | Widget de calidad del aire |
| Refugios climáticos | valencia.es/dadesobertes | Mapa de refugios |
| Padrón municipal | datos.gob.es (municipio Valencia) | Priorización de refugios |
