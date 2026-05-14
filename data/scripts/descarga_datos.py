"""
Script de descarga de todos los datasets necesarios para Valencia Sombra Viva.

Fuentes:
  - Ayuntamiento de Valencia: https://www.valencia.es/dadesobertes/
  - Geoportal Valencia: https://geoportal.valencia.es
  - Open Data VLCi: https://opendata.vlci.valencia.es
  - GVA (Generalitat Valenciana): https://dadesobertes.gva.es/

Ejecutar desde la raíz del proyecto:
    python data/scripts/descarga_datos.py
"""

import requests
from pathlib import Path

RAW_DIR = Path(__file__).parent.parent / "raw"
RAW_DIR.mkdir(exist_ok=True)

DATASETS = [
    {
        "nombre": "calidad_aire_tiempo_real",
        "preferidos": ["GeoJSON"],
        "urls": [
            # Estaciones RVVCCA del municipio de Valencia — se actualiza ~cada hora
            # Capa 156 del servicio OPENDATA/MedioAmbiente del Geoportal de Valencia
            "https://geoportal.valencia.es/server/rest/services/OPENDATA/MedioAmbiente/MapServer/156/query?where=1=1&outFields=*&outSR=4326&f=geojson",
        ],
        "archivo": "calidad_aire_tiempo_real.json",
        "descripcion": "Calidad del aire en tiempo real - estaciones RVVCCA Valencia (GeoJSON)",
    },
    {
        "nombre": "calidad_aire_historico",
        "preferidos": ["CSV"],
        "urls": [
            # Datos horarios 2021-2022 (RVVCCA)
            "https://opendata.vlci.valencia.es/dataset/6b0b7ec3-0aff-4757-bf1c-0a95cda7e98d/resource/19b5a1a7-5888-4d3e-b69b-3c1436d64e6e/download/rvvcca_d_horarios_2021-2022.csv",
            # Datos horarios 2016-2020
            "https://opendata.vlci.valencia.es/dataset/81e947f7-4be5-4e2e-b73e-4a74c9c0b15b/resource/786675f9-6cff-4fd5-9946-ccbc4d8c87c8/download/rvvcca_d_horarios_2016-2020.csv",
        ],
        "archivo": "calidad_aire_historico.csv",
        "descripcion": "Calidad del aire histórico horario 2021-2022 - RVVCCA Valencia",
    },
    {
        "nombre": "infociudad",
        "preferidos": ["GeoJSON"],
        "urls": [
            # Equipamientos municipales (bibliotecas idclase=1, centros mayores idclase=3, etc.)
            "https://geoportal.valencia.es/apps/OpenData/SociedadBienestar/v_infociudad.json",
        ],
        "archivo": "infociudad.json",
        "descripcion": "Equipamientos municipales de Valencia (bibliotecas: idclase=1, mayores: idclase=3)",
    },
    {
        "nombre": "ss_mayores",
        "preferidos": ["GeoJSON"],
        "urls": [
            # Recursos sociales dirigidos a personas mayores (centros de día, residencias, etc.)
            "https://geoportal.valencia.es/apps/OpenData/SociedadBienestar/SS_MAYORES.json",
        ],
        "archivo": "ss_mayores.json",
        "descripcion": "Recursos sociales para personas mayores de Valencia",
    },
    {
        "nombre": "fuentes_agua",
        "preferidos": ["GeoJSON"],
        "urls": [
            # Fuentes de agua pública de la vía pública (capa 158, outSR=4326 para WGS84)
            "https://geoportal.valencia.es/server/rest/services/OPENDATA/MedioAmbiente/MapServer/158/query?where=1=1&outFields=*&outSR=4326&f=geojson",
        ],
        "archivo": "fuentes_agua.json",
        "descripcion": "Fuentes de agua pública de Valencia",
    },
    {
        "nombre": "fuentes_pusdar",
        "preferidos": ["GeoJSON"],
        "urls": [
            # Fuentes PUSDAR — agua filtrada y refrigerada (25 puntos)
            "https://opendata.vlci.valencia.es/dataset/c83420e6-1553-4873-b2f1-1d86241b88fb/resource/60173cfc-288a-4fa2-ac16-75c2e09b24be/download/fonts_pusdar-v3.geojson",
        ],
        "archivo": "fuentes_pusdar.json",
        "descripcion": "Fuentes PUSDAR (agua filtrada y refrigerada) de Valencia",
    },
    {
        "nombre": "hospitales",
        "preferidos": ["GeoJSON"],
        "urls": [
            # Hospitales y centros de salud 2024 — usados como refugios climáticos
            "https://opendata.vlci.valencia.es/dataset/c389b148-0fad-46b2-8c7b-f5c5aa866a65/resource/82588e44-2ba8-4038-9bc9-5fb1ce2428d2/download/hospitales.geojson",
        ],
        "archivo": "hospitales.json",
        "descripcion": "Hospitales y centros de salud de Valencia (como refugios climáticos)",
    },
    {
        "nombre": "padron_manzanas",
        "preferidos": ["GeoJSON"],
        "urls": [
            # Manzanas catastrales con población por tramos de edad (0-14, 15-65, >66, total)
            "https://geoportal.valencia.es/apps/OpenData/UrbanismoEInfraestructuras/MANZANAS.json",
        ],
        "archivo": "padron_manzanas.json",
        "descripcion": "Población por edad y manzana catastral de Valencia",
    },
    # ───────────────────────────────────────────────────────────────────────
    # MDS/MDT — descarga MANUAL desde el ICV (Institut Cartogràfic Valencià)
    # https://icv.gva.es → Descargas → LiDAR / Modelos de Elevación
    # Convertir a COG: gdal_translate -of COG input.tif MDS_Valencia_1m.tif
    # Guardar en: data/raw/mds/ y data/raw/mdt/
]


def descargar(dataset: dict) -> None:
    destino = RAW_DIR / dataset["archivo"]
    if destino.exists():
        print(f"  [SKIP] {dataset['nombre']} ya descargado")
        return

    print(f"  [DESCARGANDO] {dataset['nombre']} ...")
    headers = {"User-Agent": "valencia-sombra-viva/1.0"}
    ultimo_error = None

    for url in dataset["urls"]:
        try:
            r = requests.get(url, timeout=60, headers=headers)
            r.raise_for_status()
            destino.write_bytes(r.content)
            print(f"  [OK] {destino.name} ({len(r.content) / 1024:.1f} KB)")
            print(f"       fuente: {url}")
            return
        except requests.RequestException as e:
            ultimo_error = e
            print(f"  [FALLBACK] URL no disponible: {url}")

    print(f"  [ERROR] {dataset['nombre']}: {ultimo_error}")


if __name__ == "__main__":
    print("Descargando datasets del Portal de Datos Abiertos de Valencia...\n")
    for ds in DATASETS:
        print(f"  {ds['descripcion']}")
        descargar(ds)

    print("\nNOTA: El MDT/MDS (Modelo Digital del Terreno/Superficies) debe descargarse manualmente.")
    print("  URL: https://centrodedescargas.cnig.es/CentroDescargas/modelos-digitales-elevaciones")
    print("  Producto: MDS02 (sombras) + MDT02 (terreno), 2m resolución, EPSG:25830")
    print("  Convertir a COG: gdal_translate -of COG input.tif MDS_Valencia_2m.tif")
    print("  Guardar en: data/raw/mdt/ y data/raw/mds/")
    print("\nDescarga completada.")
