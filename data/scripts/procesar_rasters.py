"""
Fusiona los 8 tiles MDS02 de Valencia en un único COG (Cloud-Optimized GeoTIFF).
Ejecutar desde la raíz del proyecto:
    python data/scripts/procesar_rasters.py
"""

from pathlib import Path
import numpy as np

RAW_MDS  = Path(__file__).parent.parent / "raw" / "mds"
OUT_MDS  = RAW_MDS / "MDS_Valencia_2m.tif"

TILES = sorted(RAW_MDS.glob("MDS02_ETRS89_H30_PM-2_*.tif"))


def merge_cog():
    import rasterio
    from rasterio.merge import merge
    from rasterio.enums import Resampling

    if OUT_MDS.exists():
        print(f"[SKIP] {OUT_MDS.name} ya existe ({OUT_MDS.stat().st_size / 1e6:.0f} MB)")
        return

    if not TILES:
        print("[ERROR] No se encontraron tiles MDS02 en", RAW_MDS)
        return

    print(f"Abriendo {len(TILES)} tiles...")
    datasets = [rasterio.open(t) for t in TILES]

    print("Fusionando (puede tardar 1-3 min para 1 GB de datos)...")
    mosaic, transform = merge(datasets, resampling=Resampling.nearest)

    meta = datasets[0].meta.copy()
    meta.update({
        "driver": "GTiff",
        "height": mosaic.shape[1],
        "width":  mosaic.shape[2],
        "transform": transform,
        "compress": "deflate",
        "tiled": True,
        "blockxsize": 512,
        "blockysize": 512,
        "copy_src_overviews": True,
    })

    # Guardar primero como GeoTIFF normal
    tmp = OUT_MDS.with_suffix(".tmp.tif")
    print(f"Guardando GeoTIFF temporal ({tmp.name})...")
    with rasterio.open(tmp, "w", **meta) as dst:
        dst.write(mosaic)

    for ds in datasets:
        ds.close()

    # Convertir a COG añadiendo overviews
    print("Convirtiendo a COG con overviews...")
    with rasterio.open(tmp, "r+") as ds:
        overviews = [2, 4, 8, 16, 32]
        ds.build_overviews(overviews, Resampling.average)
        ds.update_tags(ns="rio_overview", resampling="average")

    meta_cog = meta.copy()
    meta_cog["copy_src_overviews"] = True

    with rasterio.open(tmp) as src:
        with rasterio.open(OUT_MDS, "w", **meta_cog) as dst:
            dst.write(src.read())
            dst.update_tags(**src.tags())

    tmp.unlink()
    size_mb = OUT_MDS.stat().st_size / 1e6
    print(f"[OK] {OUT_MDS.name} generado ({size_mb:.0f} MB)")
    print(f"     Dimensiones: {mosaic.shape[2]} x {mosaic.shape[1]} px")


if __name__ == "__main__":
    merge_cog()
    print("\nProcesamiento completado.")
    print(f"Archivo final: {OUT_MDS}")
