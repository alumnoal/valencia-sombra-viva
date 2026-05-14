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
BBOX = (39.445, -0.400, 39.495, -0.340)   # (sur, oeste, norte, este)


def build():
    import osmnx as ox

    if PICKLE_PATH.exists():
        size_mb = PICKLE_PATH.stat().st_size / 1e6
        print(f"[SKIP] {PICKLE_PATH.name} ya existe ({size_mb:.1f} MB)")
        return

    print(f"Descargando grafo peatonal OSM para Valencia bbox={BBOX}...")
    print("(puede tardar 30-60 segundos)")

    north, south = BBOX[2], BBOX[0]
    east,  west  = BBOX[3], BBOX[1]

    G = ox.graph_from_bbox(
        bbox=(north, south, east, west),
        network_type="walk",
        simplify=True,
    )
    G = ox.truncate.largest_component(G, strongly=True)

    print(f"Grafo WGS84: {len(G.nodes)} nodos, {len(G.edges)} edges")

    ox.save_graphml(G, GRAPHML_PATH)
    print(f"[OK] GraphML guardado: {GRAPHML_PATH.name}")

    G_proj = ox.project_graph(G, to_crs="EPSG:25830")
    print(f"Grafo proyectado a EPSG:25830")

    with open(PICKLE_PATH, "wb") as f:
        pickle.dump(G_proj, f, protocol=4)

    size_mb = PICKLE_PATH.stat().st_size / 1e6
    print(f"[OK] Pickle guardado: {PICKLE_PATH.name} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    build()
    print("\nGrafo OSM listo para subir a HuggingFace.")
    print(f"Archivo: {PICKLE_PATH}")
