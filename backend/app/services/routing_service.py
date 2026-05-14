"""
Servicio de routing de rutas frescas (con sombra) para Valencia.

Estrategia de rendimiento:
1. Grafo OSM cacheado en memoria (descarga única ~15s al arrancar)
2. Ruta corta O(E log V) para encontrar el corredor origen→destino
3. Subgrafo del corredor (bbox de la ruta + 400m buffer) → solo ~200-600 edges
4. MDS del corredor precargado en numpy (2 lecturas de disco en total)
5. Ray-casting sobre arrays en memoria → microsegundos por edge
6. Dijkstra ponderado por sombra sobre el subgrafo
"""

import math
import os
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Optional

from pyproj import Transformer

from app.core.solar_geometry import get_sun_position

# osmnx, networkx, numpy, rasterio se importan lazy dentro de las funciones
# para no consumir ~300MB de RAM al arrancar el servidor

_utm_to_wgs84 = Transformer.from_crs("EPSG:25830", "EPSG:4326", always_xy=True)
_wgs84_to_utm = Transformer.from_crs("EPSG:4326", "EPSG:25830", always_xy=True)


def _node_lonlat(node_data: dict) -> tuple[float, float]:
    """Devuelve (lon, lat) de un nodo del grafo proyectado."""
    if "lon" in node_data and "lat" in node_data:
        return node_data["lon"], node_data["lat"]
    # Fallback: convertir UTM → WGS84
    lon, lat = _utm_to_wgs84.transform(node_data["x"], node_data["y"])
    return lon, lat


def _data_root() -> Path:
    d = os.environ.get("DATA_DIR", "")
    return Path(d) if d else Path(__file__).parent.parent.parent.parent / "data"


_DATA_ROOT = _data_root()
MDS_PATH = _DATA_ROOT / "raw" / "mds" / "MDS_Valencia_2m.tif"
MDT_PATH = _DATA_ROOT / "raw" / "mdt" / "MDT_Valencia_2m.tif"

# Área urbana central de Valencia (centro histórico, Eixample, Ruzafa, Benimaclet)
# ~6 km × 5 km — manejable para osmnx en una sola consulta
VALENCIA_URBAN_BBOX = (39.445, -0.400, 39.495, -0.340)   # (sur, oeste, norte, este)
DEFAULT_SHADE_WEIGHT = 2.0
CORRIDOR_BUFFER_M = 400

GRAPH_CACHE_PATH = _DATA_ROOT / "processed" / "osm_walk_graph.graphml"
_PROJECTED_CACHE_PATH = _DATA_ROOT / "processed" / "osm_walk_graph_25830.graphml"
_PICKLE_CACHE_PATH = _DATA_ROOT / "processed" / "osm_walk_graph_25830.pkl"
_TMP_PICKLE = Path("/tmp/osm_walk_graph_25830.pkl")
_HF_BASE = os.environ.get("HF_DATASET_URL", "").rstrip("/")


@lru_cache(maxsize=1)
def _get_graph():
    """
    Carga el grafo peatonal de Valencia.
    1. Pickle local (dev o volumen)
    2. Pickle en /tmp (descargado desde HF en ejecuciones anteriores)
    3. Descarga pickle desde HF_DATASET_URL → /tmp
    4. GraphML proyectado local
    5. GraphML WGS84 local → proyecta y guarda pickle
    6. Descarga tiles OSM (último recurso)
    """
    import pickle

    for p in [_PICKLE_CACHE_PATH, _TMP_PICKLE]:
        if p.exists():
            with open(p, "rb") as f:
                return pickle.load(f)

    if _HF_BASE:
        import httpx
        url = f"{_HF_BASE}/osm_walk_graph_25830.pkl"
        print(f"[DL] Descargando grafo desde HF...")
        with httpx.Client(timeout=300, follow_redirects=True) as client:
            r = client.get(url)
            r.raise_for_status()
            _TMP_PICKLE.write_bytes(r.content)
        print(f"[OK] Grafo ({_TMP_PICKLE.stat().st_size // 1_000_000} MB)")
        with open(_TMP_PICKLE, "rb") as f:
            return pickle.load(f)

    import osmnx as ox

    GRAPH_CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)

    if _PROJECTED_CACHE_PATH.exists():
        G = ox.load_graphml(_PROJECTED_CACHE_PATH)
        try:
            with open(_PICKLE_CACHE_PATH, "wb") as f:
                pickle.dump(G, f, protocol=4)
        except Exception:
            pass
        return G

    if GRAPH_CACHE_PATH.exists():
        G = ox.load_graphml(GRAPH_CACHE_PATH)
        G = ox.project_graph(G, to_crs="EPSG:25830")
        try:
            ox.save_graphml(G, _PROJECTED_CACHE_PATH)
        except Exception:
            pass
        return G

    # Grid 4×4 de tiles sobre el área urbana central de Valencia
    lons = [-0.400, -0.385, -0.370, -0.355, -0.340]
    lats = [39.445, 39.458, 39.470, 39.483, 39.495]

    tiles_xml = []
    for i in range(len(lons) - 1):
        for j in range(len(lats) - 1):
            bbox = f"{lons[i]},{lats[j]},{lons[i+1]},{lats[j+1]}"
            url = f"https://api.openstreetmap.org/api/0.6/map?bbox={bbox}"
            try:
                r = requests.get(url, timeout=30)
                if r.status_code == 200:
                    tiles_xml.append(r.content)
            except Exception:
                pass
            time.sleep(0.5)

    if not tiles_xml:
        raise RuntimeError("No se pudo descargar ningún tile OSM")

    # Fusionar XML deduplicando nodos/ways por id
    root = ET.fromstring(tiles_xml[0])
    seen: dict[str, set] = {t: set() for t in ("node", "way", "relation")}
    for tag_name in ("node", "way", "relation"):
        for el in root.findall(tag_name):
            seen[tag_name].add(el.get("id"))

    for xml_bytes in tiles_xml[1:]:
        for child in ET.fromstring(xml_bytes):
            tag_name = child.tag
            eid = child.get("id")
            if tag_name in seen and eid and eid not in seen[tag_name]:
                seen[tag_name].add(eid)
                root.append(child)

    merged_xml = ET.tostring(root, encoding="unicode")
    with tempfile.NamedTemporaryFile(suffix=".osm", delete=False, mode="w", encoding="utf-8") as f:
        f.write(merged_xml)
        tmp_path = f.name

    try:
        G = ox.graph_from_xml(tmp_path, simplify=True)
        G = ox.truncate.largest_component(G, strongly=True)
    finally:
        os.unlink(tmp_path)

    ox.save_graphml(G, GRAPH_CACHE_PATH)
    G = ox.project_graph(G, to_crs="EPSG:25830")
    return G


@lru_cache(maxsize=1)
def _open_mds():
    import rasterio
    if _HF_BASE:
        try:
            return rasterio.open(f"/vsicurl/{_HF_BASE}/MDS_Valencia_2m.tif")
        except Exception as e:
            print(f"[WARN] MDS vsicurl routing: {e}")
    return rasterio.open(MDS_PATH) if MDS_PATH.exists() else None


@lru_cache(maxsize=1)
def _open_mdt():
    import rasterio
    if _HF_BASE:
        try:
            return rasterio.open(f"/vsicurl/{_HF_BASE}/MDT_Valencia_2m.tif")
        except Exception as e:
            print(f"[WARN] MDT vsicurl routing: {e}")
    return rasterio.open(MDT_PATH) if MDT_PATH.exists() else None


def _load_window(src, x_min, y_min, x_max, y_max, buffer=0):
    """Carga una ventana del raster en memoria como array numpy."""
    import rasterio.windows
    win = rasterio.windows.from_bounds(
        x_min - buffer, y_min - buffer, x_max + buffer, y_max + buffer,
        src.transform,
    )
    # Recortar a los límites del raster
    win = win.intersection(rasterio.windows.Window(0, 0, src.width, src.height))
    data = src.read(1, window=win)
    win_transform = rasterio.windows.transform(win, src.transform)
    nodata = src.nodata
    return data, win_transform, nodata


def _sample(data, transform, nodata, x, y) -> float | None:
    """Lee un valor del array en memoria por coordenadas UTM."""
    col_f, row_f = ~transform * (x, y)
    row, col = int(row_f), int(col_f)
    if not (0 <= row < data.shape[0] and 0 <= col < data.shape[1]):
        return None
    val = float(data[row, col])
    if nodata is not None and abs(val - nodata) < abs(nodata) * 0.01 + 1.0:
        return None
    return val


def _is_blocked(mds_data, mds_tr, mds_nd,
                mdt_data, mdt_tr, mdt_nd,
                x0, y0, ray_dx, ray_dy, tan_el) -> bool:
    """Ray-casting sobre arrays en memoria. Rápido: sin I/O."""
    base = _sample(mdt_data, mdt_tr, mdt_nd, x0, y0) if mdt_data is not None else None
    if base is None:
        base = _sample(mds_data, mds_tr, mds_nd, x0, y0)
    if base is None:
        return False

    for dist in range(5, 201, 5):
        sx, sy = x0 + ray_dx * dist, y0 + ray_dy * dist
        surface = _sample(mds_data, mds_tr, mds_nd, sx, sy)
        if surface is None:
            continue
        if surface > base + dist * tan_el + 0.5:
            return True
    return False


def _shadow_fraction_fast(mds_data, mds_tr, mds_nd,
                           mdt_data, mdt_tr, mdt_nd,
                           x0, y0, ray_dx, ray_dy, tan_el) -> float:
    """Índice de sombra 0-1 para un punto usando arrays en memoria."""
    return 1.0 if _is_blocked(mds_data, mds_tr, mds_nd,
                               mdt_data, mdt_tr, mdt_nd,
                               x0, y0, ray_dx, ray_dy, tan_el) else 0.0


def _corridor_bbox(G, route):
    """Bounding box UTM de los nodos de una ruta."""
    xs = [G.nodes[n]["x"] for n in route]
    ys = [G.nodes[n]["y"] for n in route]
    return min(xs), min(ys), max(xs), max(ys)


def _nearest_node(G, lat, lon):
    import osmnx as ox
    x, y = _wgs84_to_utm.transform(lon, lat)
    return ox.distance.nearest_nodes(G, X=x, Y=y)


def _route_to_geojson(G, route):
    coords, total_len, shaded_len, segments = [], 0.0, 0.0, []

    for i in range(len(route) - 1):
        u, v = route[i], route[i + 1]
        edge = min(G[u][v].values(), key=lambda d: d.get("cost", d.get("length", 0)))
        length = edge.get("length", 0)
        shadow_frac = edge.get("shadow_frac", 0.0)

        u_node, v_node = G.nodes[u], G.nodes[v]
        u_lon, u_lat = _node_lonlat(u_node)
        v_lon, v_lat = _node_lonlat(v_node)

        if i == 0:
            coords.append([u_lon, u_lat])
        coords.append([v_lon, v_lat])

        total_len += length
        shaded_len += length * shadow_frac
        segments.append({"longitud_m": round(length, 1), "sombra_pct": round(shadow_frac * 100, 1)})

    pct = round(shaded_len / total_len * 100, 1) if total_len > 0 else 0.0
    return {
        "type": "Feature",
        "geometry": {"type": "LineString", "coordinates": coords},
        "properties": {
            "longitud_total_m": round(total_len, 1),
            "porcentaje_sombra": pct,
            "segmentos": segments,
        },
    }


def calcular_ruta_fresca(
    origin_lat: float, origin_lon: float,
    dest_lat: float,   dest_lon: float,
    dt: Optional[datetime] = None,
    shade_weight: float = DEFAULT_SHADE_WEIGHT,
) -> dict:
    import networkx as nx

    if dt is None:
        dt = datetime.now(timezone.utc)

    sun = get_sun_position(dt, origin_lat, origin_lon)
    G = _get_graph()

    # Graph covers -0.400...-0.340 lon, 39.445...39.495 lat
    LAT_MIN, LAT_MAX = 39.445, 39.495
    LON_MIN, LON_MAX = -0.400, -0.340

    def _out_of_coverage(lat, lon):
        return not (LAT_MIN <= lat <= LAT_MAX and LON_MIN <= lon <= LON_MAX)

    if _out_of_coverage(origin_lat, origin_lon) or _out_of_coverage(dest_lat, dest_lon):
        return {
            "error": (
                "Uno o ambos puntos están fuera de la zona cubierta. "
                "El grafo cubre el área urbana central de Valencia (centro histórico, Eixample, Ruzafa, Benimaclet). "
                f"Área válida: lat {LAT_MIN}–{LAT_MAX}, lon {LON_MIN}–{LON_MAX}."
            )
        }

    orig_node = _nearest_node(G, origin_lat, origin_lon)
    dest_node = _nearest_node(G, dest_lat, dest_lon)

    if orig_node == dest_node:
        return {"error": "Origen y destino están demasiado cerca o son el mismo punto en el callejero"}

    # 1. Ruta más corta (sin sombra, rápida)
    try:
        route_short = nx.shortest_path(G, orig_node, dest_node, weight="length")
    except nx.NetworkXNoPath:
        return {"error": "No existe ruta entre los puntos indicados"}

    # Marcar shadow_frac=0 en los edges de la ruta corta
    for u, v in zip(route_short, route_short[1:]):
        for key in G[u][v]:
            G[u][v][key].setdefault("shadow_frac", 0.0)
            G[u][v][key].setdefault("cost", G[u][v][key].get("length", 1.0))

    # 2. Ruta fresca solo si hay luz solar
    route_fresh = route_short
    if sun["is_daytime"]:
        az_rad = math.radians(sun["azimuth"])
        ray_dx = math.sin(az_rad)
        ray_dy = math.cos(az_rad)
        tan_el = math.tan(math.radians(sun["elevation"]))

        # 3. Corredor: subgrafo bbox(ruta_corta) + buffer
        x_min, y_min, x_max, y_max = _corridor_bbox(G, route_short)
        buf = CORRIDOR_BUFFER_M

        nodes_corridor = [
            n for n, d in G.nodes(data=True)
            if x_min - buf <= d["x"] <= x_max + buf
            and y_min - buf <= d["y"] <= y_max + buf
        ]
        H = G.subgraph(nodes_corridor).copy()

        # Verificar que origen y destino están en el subgrafo
        if orig_node not in H or dest_node not in H:
            H = G  # fallback al grafo completo si no están

        # 4. Cargar MDS y MDT del corredor en memoria (2 lecturas de disco)
        mds_src = _open_mds()
        mdt_src = _open_mdt()

        mds_data = mds_tr = mds_nd = None
        mdt_data = mdt_tr = mdt_nd = None

        if mds_src:
            mds_data, mds_tr, mds_nd = _load_window(mds_src, x_min, y_min, x_max, y_max, buffer=buf + 250)
        if mdt_src:
            mdt_data, mdt_tr, mdt_nd = _load_window(mdt_src, x_min, y_min, x_max, y_max, buffer=buf + 250)

        # 5. Ponderar edges del corredor con sombra
        for u, v, key, data in H.edges(data=True, keys=True):
            length = data.get("length", 1.0)
            # Punto medio del edge en UTM
            ux, uy = G.nodes[u]["x"], G.nodes[u]["y"]
            vx, vy = G.nodes[v]["x"], G.nodes[v]["y"]
            mx, my = (ux + vx) / 2, (uy + vy) / 2

            if mds_data is not None:
                shadow_frac = _shadow_fraction_fast(
                    mds_data, mds_tr, mds_nd,
                    mdt_data, mdt_tr, mdt_nd,
                    mx, my, ray_dx, ray_dy, tan_el,
                )
            else:
                shadow_frac = 0.0

            cost = length * (1.0 + shade_weight * (1.0 - shadow_frac))
            H[u][v][key]["shadow_frac"] = shadow_frac
            H[u][v][key]["cost"] = cost

        # Propagar shadow_frac al grafo original para el GeoJSON
        for u, v, key, data in H.edges(data=True, keys=True):
            if v in G[u] and key in G[u][v]:
                G[u][v][key]["shadow_frac"] = data.get("shadow_frac", 0.0)
                G[u][v][key]["cost"] = data.get("cost", data.get("length", 1.0))

        # 6. Ruta fresca en el subgrafo ponderado
        try:
            route_fresh = nx.shortest_path(H, orig_node, dest_node, weight="cost")
        except nx.NetworkXNoPath:
            route_fresh = route_short

    geojson_fresh = _route_to_geojson(G, route_fresh)
    geojson_short = _route_to_geojson(G, route_short)

    props_f = geojson_fresh["properties"]
    props_s = geojson_short["properties"]
    extra_m = props_f["longitud_total_m"] - props_s["longitud_total_m"]
    extra_shade = props_f["porcentaje_sombra"] - props_s["porcentaje_sombra"]

    return {
        "ruta_fresca": geojson_fresh,
        "ruta_corta":  geojson_short,
        "sol": {
            "azimut":    round(sun["azimuth"], 1),
            "elevacion": round(sun["elevation"], 1),
            "es_de_dia": sun["is_daytime"],
        },
        "comparativa": {
            "metros_extra":         round(extra_m, 1),
            "puntos_sombra_extra":  round(extra_shade, 1),
            "merece_la_pena":       extra_shade > 5 and extra_m < 500,
        },
    }
