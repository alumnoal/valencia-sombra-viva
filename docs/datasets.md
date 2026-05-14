# Datasets utilizados — Valencia Sombra Viva

Los datasets proceden de:
- [Portal de Datos Abiertos del Ayuntamiento de Valencia](https://www.valencia.es/dadesobertes/)
- [Portal de Datos Abiertos de la GVA](https://dadesobertes.gva.es/)
- [Datos.gob.es](https://datos.gob.es/) (filtrado por municipio Valencia)
- [ICV — Institut Cartogràfic Valencià](https://icv.gva.es/) (rasters MDS/MDT)

## Datasets principales

| Dataset | Fuente | Formato | Uso en el proyecto |
|---------|--------|---------|-------------------|
| Modelo Digital de Superficies (MDS) | ICV | GeoTIFF COG (EPSG:25830) | Elevaciones con edificios — cálculo dinámico de sombras (fuente principal) |
| Modelo Digital del Terreno (MDT) | ICV | GeoTIFF COG (EPSG:25830) | Elevaciones de terreno puro — fallback si MDS no disponible |
| Callejero OSM de Valencia | OpenStreetMap vía osmnx | GraphML / Pickle | Grafo de calles para routing de ruta fresca |
| Calidad del aire - tiempo real | RVVCCA / dadesobertes.gva.es | CSV | Alerta de contaminación + índice de ruta segura |
| Calidad del aire - histórico | RVVCCA / dadesobertes.gva.es | CSV | Análisis de patrones temporales por zona |
| Padrón municipal (por edad) | datos.gob.es (INE, municipio 46250) | CSV | Priorización de refugios por concentración de mayores |
| Farmacias de guardia | GVA | CSV / JSON | Refugios climáticos de guardia |
| Centros de mayores / centros de día | valencia.es/dadesobertes | JSON | Refugios climáticos permanentes |
| Bibliotecas públicas | valencia.es/dadesobertes | JSON | Refugios climáticos con AC |
| Fuentes de agua potable (bebers) | valencia.es/dadesobertes | JSON | Puntos de hidratación en ruta |

## Descarga automática

```bash
python data/scripts/descarga_datos.py
```

## Nota sobre los modelos de elevación

### MDS (fuente principal) — `data/raw/mds/MDS_Valencia_1m.tif`
Descarga manual desde el ICV (Institut Cartogràfic Valencià):
- URL: https://icv.gva.es → Descargas → LiDAR / Modelos de Elevación
- Resolución: 1m · CRS: EPSG:25830 · Cobertura: municipio de Valencia
- **Incluye edificios** → permite ray-casting real de sombras de edificios
- Convertir a COG: `gdal_translate -of COG input.tif MDS_Valencia_1m.tif`

### MDT (fallback) — `data/raw/mdt/MDT_Valencia_COG.tif`
Solo terreno sin edificios. Se usa automáticamente si el MDS no está disponible.
- Misma fuente ICV, misma resolución

## RVVCCA — Red Valenciana de Vigilancia y Control de la Contaminación Atmosférica

Estaciones de medición en el municipio de Valencia (códigos aproximados — verificar en dadesobertes.gva.es):

| Código | Nombre | Lat | Lon |
|--------|--------|-----|-----|
| 8 | Conselleria de Sanitat | 39.4701 | -0.3768 |
| 16 | Valencia - Centre | 39.4742 | -0.3756 |
| 43 | Pista de Silla | 39.4148 | -0.4019 |
| 44 | Avda. Francia | 39.4574 | -0.3467 |
| 47 | Politècnic | 39.4809 | -0.3399 |
| 58 | Quatre Carreres | 39.4553 | -0.3637 |
| 60 | Molí del Sol | 39.4450 | -0.4003 |
| 63 | Benicalap | 39.4921 | -0.3940 |
