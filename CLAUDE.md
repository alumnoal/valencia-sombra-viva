# Valencia Sombra Viva — Instrucciones para Claude Code

## Contexto del proyecto

Este proyecto es una adaptación directa de **Madrid Sombra Viva** para la ciudad de Valencia.
Se presenta a los **Premios Datos Abiertos Valencia 2026** (plazo: 8 de junio de 2026, dotación: 20.000 €).

El código fuente fue copiado del proyecto Madrid y **aún contiene referencias a Madrid** en textos,
coordenadas, URLs y nombres de datasets. Tu trabajo es adaptarlo a Valencia de forma completa.

## Qué hacer en esta sesión

### 1. Renombrar / rebrandear "Madrid" → "Valencia"
- `backend/app/main.py` → título, descripción, nombre del proyecto
- `backend/app/core/config.py` → coordenadas del centro (Valencia: lat 39.4699, lon -0.3763), umbral de calor
- Todos los `*.py` y `*.jsx` que mencionen "Madrid" en literales de texto, nombres de variables o comentarios
- `docs/arquitectura.md` y `docs/datasets.md`
- `README.md` (crear uno nuevo para Valencia)

### 2. Adaptar el backend a los datos abiertos de Valencia

El portal de datos abiertos de Valencia es: https://www.valencia.es/dadesobertes/

Datasets equivalentes a buscar (en ese portal o en datos.gob.es con filtro Valencia):
- **Modelo Digital de Superficies (MDS)** o similar — para ray-casting de sombras
  - Alternativa: Institut Cartogràfic Valencià (ICV) https://icv.gva.es
- **Refugios climáticos / puntos de frescor** de Valencia
- **Calidad del aire** en tiempo real — Valencia tiene RVVCCA (Red Valenciana de Vigilancia)
  - API: https://mediambient.gva.es — buscar endpoint JSON
- **Padrón municipal** por edades y barrio — datos.gob.es con filtro municipio Valencia
- **Bibliotecas, centros de mayores, fuentes públicas** de Valencia

Para cada dataset: actualiza la URL de descarga en `data/scripts/descarga_datos.py`
y el service correspondiente en `backend/app/services/`.

### 3. Zona cubierta para el grafo OSM

En `backend/app/services/routing_service.py`, cambiar el bbox del grafo:
- Madrid: lat 40.408–40.452, lon -3.715–-3.671 (almendra central / M-30)
- Valencia: usar el área urbana central — lat 39.445–39.495, lon -0.400–-0.340
  (cubre el centro histórico, Eixample, Ruzafa, Benimaclet)
- Ajustar el parámetro `place` de osmnx si se usa por nombre: `"Valencia, Spain"`

### 4. Adaptar el frontend

- `frontend/src/App.jsx` → título de la app, descripción, colores (sugerencia: naranja/azul Valencia)
- `frontend/src/components/Landing/` → textos de bienvenida, nombre de la ciudad
- `frontend/src/components/Map/` → centrar el mapa en Valencia (39.4699, -0.3763), zoom inicial
- `frontend/src/components/Refugios/` → etiquetas en valenciano/castellano según corresponda
- `frontend/index.html` → `<title>` y meta description

### 5. Infraestructura

- `render.yaml` → cambiar nombre del servicio: `valencia-sombra-viva-api`
- `frontend/vercel.json` → sin cambios (Vercel detecta automáticamente)
- `upload_to_hf.py` y `upload-rasters.ps1` → cambiar nombre del dataset HuggingFace
  a algo como `tu-usuario/valencia-sombra-viva-rasters`

### 6. Rasters en HuggingFace

Una vez tengas el MDS/MDT de Valencia:
1. Convertirlos a COG (Cloud-Optimized GeoTIFF) con el mismo proceso que Madrid
2. Subirlos a un dataset HuggingFace nuevo
3. Actualizar `HF_DATASET_URL` en las variables de entorno de Render

## Referencia: cómo funciona el motor de sombras

El cálculo de sombras (`mds_service.py`) es **genérico** — funciona con cualquier GeoTIFF COG
en EPSG:25830 o cualquier UTM. Solo necesita que el raster esté en el CRS correcto para Valencia
(EPSG:25830 también cubre Valencia, no hace falta cambiar proyección).

## Autor

Ricardo González Alonso — Universidad Carlos III de Madrid (100454280@alumnos.uc3m.es)
