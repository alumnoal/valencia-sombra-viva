"""
Descarga el grafo peatonal de Valencia desde OSM y lo guarda como pickle EPSG:25830.
Ejecutar desde la raíz del proyecto:
    python data/scripts/build_graph.py
"""

import pickle
from pathlib import Path

OUT_DIR = Path(__file__).parent.parent / "processed"
OUT_DIR.mkdir(parents=True, exist_ok=True)

GRAPHML_PATH = OUT_DIR / "osm_walk_graph.graphml"
PICKLE_PATH  = OUT_DIR / "osm_walk_graph_25830.pkl"

# Área urbana central de Valencia (mismo bbox que routing_service.py)
# (norte, sur, este, oeste) para osmnx
NORTH, SOUTH = 39.495, 39.445
EAST,  WEST  = -0.340, -0.400


def build():
    import osmnx as ox

    if PICKLE_PATH.exists():
        size_mb = PICKLE_PATH.stat().st_size / 1e6
        print(f"[SKIP] {PICKLE_PATH.name} ya existe ({size_mb:.1f} MB)")
        return

    # Descargar toda la red peatonal de Valencia en una sola query Overpass
    # y luego recortar al bbox. Mucho más rápido que sub-queries por bbox.
    print("Descargando grafo peatonal de Valencia ciudad...")
    print("(query única a Overpass, ~1-3 minutos)")

    G = ox.graph_from_place(
        "Valencia, Spain",
        network_type="walk",
        simplify=True,
        which_result=1,
    )

    print(f"Grafo completo: {len(G.nodes)} nodos, {len(G.edges)} edges")
    print("Recortando al bbox del area urbana central...")

    G = ox.truncate.truncate_graph_bbox(
        G,
        bbox=(NORTH, SOUTH, EAST, WEST),
    )
    G = ox.truncate.largest_component(G, strongly=True)

    print(f"Grafo recortado: {len(G.nodes)} nodos, {len(G.edges)} edges")

    ox.save_graphml(G, GRAPHML_PATH)
    print(f"[OK] GraphML guardado: {GRAPHML_PATH.name}")

    G_proj = ox.project_graph(G, to_crs="EPSG:25830")
    print("Grafo proyectado a EPSG:25830")

    with open(PICKLE_PATH, "wb") as f:
        pickle.dump(G_proj, f, protocol=4)

    size_mb = PICKLE_PATH.stat().st_size / 1e6
    print(f"[OK] Pickle guardado: {PICKLE_PATH.name} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    build()
    print("\nGrafo OSM listo para subir a HuggingFace.")
    print(f"Archivo: {PICKLE_PATH}")
