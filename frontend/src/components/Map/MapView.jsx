import React, { useEffect } from "react";
import {
  MapContainer, TileLayer, ZoomControl,
  Marker, Popup, Polyline, Rectangle, useMap,
} from "react-leaflet";
import L from "leaflet";

const VALENCIA_CENTER = [39.4699, -0.3763];

const TIPO_COLORES = {
  fuente: "#38bdf8", biblioteca: "#a78bfa",
  centro_mayores: "#fb923c", farmacia: "#4ade80",
};
const TIPO_ICONOS = {
  fuente: "💧", biblioteca: "📚",
  centro_mayores: "🏠", farmacia: "💊",
};

function iconoRefugio(tipo) {
  const color = TIPO_COLORES[tipo] || "#94a3b8";
  const emoji = TIPO_ICONOS[tipo] || "📍";
  return L.divIcon({
    html: `<div style="background:${color};border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.4);border:2px solid white;">${emoji}</div>`,
    className: "", iconSize: [28, 28], iconAnchor: [14, 14],
  });
}

function iconoAire(indice) {
  const colores = { bueno: "#4ade80", razonable: "#fbbf24", malo: "#f87171" };
  const color = colores[indice] || "#94a3b8";
  return L.divIcon({
    html: `<div style="background:${color};border-radius:4px;width:12px;height:12px;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
    className: "", iconSize: [12, 12], iconAnchor: [6, 6],
  });
}

function iconoSonar() {
  return L.divIcon({
    html: `<div style="position:relative;width:12px;height:12px;">
      <div style="position:absolute;inset:0;background:#FF6B1A;border-radius:50%;box-shadow:0 0 6px rgba(255,107,26,0.8);"></div>
      <div class="sonar-ring"  style="position:absolute;inset:-4px;border:1.5px solid #FF6B1A;border-radius:50%;"></div>
      <div class="sonar-ring2" style="position:absolute;inset:-4px;border:1px solid #FF6B1A;border-radius:50%;"></div>
    </div>`,
    className: '',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

function iconoPunto(color, letra) {
  return L.divIcon({
    html: `<div style="background:${color};border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#0f172a;box-shadow:0 2px 8px rgba(0,0,0,0.5);border:2px solid white;">${letra}</div>`,
    className: "", iconSize: [30, 30], iconAnchor: [15, 15],
  });
}

// Convierte coordenadas GeoJSON [lon, lat] a Leaflet [lat, lon]
function geojsonToLatLngs(coordinates) {
  return coordinates.map(([lon, lat]) => [lat, lon]);
}

function RecenterOnClick({ onClick }) {
  const map = useMap();
  useEffect(() => {
    map.on("click", (e) => onClick(e.latlng));
    return () => map.off("click");
  }, [map, onClick]);
  return null;
}

const TILES = {
  oscuro: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  claro: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
};

export default function MapView({
  modo, mapaOscuro, refugios, estacionesAire,
  puntoSeleccionado, onMapClick,
  origen, destino, ruta,
}) {
  const tiles = mapaOscuro ? TILES.oscuro : TILES.claro;
  const rutaFrescaCoords = ruta?.ruta_fresca?.geometry?.coordinates
    ? geojsonToLatLngs(ruta.ruta_fresca.geometry.coordinates)
    : null;
  const rutaCortaCoords = ruta?.ruta_corta?.geometry?.coordinates
    ? geojsonToLatLngs(ruta.ruta_corta.geometry.coordinates)
    : null;

  return (
    <MapContainer
      center={VALENCIA_CENTER} zoom={13}
      style={{ height: "100%", width: "100%" }}
      zoomControl={false}
    >
      <TileLayer attribution={tiles.attribution} url={tiles.url} />
      <ZoomControl position="bottomright" />
      <RecenterOnClick onClick={onMapClick} />

      {puntoSeleccionado && (
        <Marker
          position={[puntoSeleccionado.lat, puntoSeleccionado.lng]}
          icon={iconoSonar()}
        />
      )}

      {/* Zona cubierta por el grafo OSM (ruta mode) */}
      {modo === "ruta" && !ruta && (
        <Rectangle
          bounds={[[39.445, -0.400], [39.495, -0.340]]}
          pathOptions={{ color: "#fbbf24", weight: 1.5, opacity: 0.5, fill: true, fillColor: "#fbbf24", fillOpacity: 0.04, dashArray: "6 4" }}
        />
      )}

      {/* ── Modo ruta fresca ── */}

      {/* Ruta corta (gris, debajo) */}
      {rutaCortaCoords && (
        <Polyline
          positions={rutaCortaCoords}
          pathOptions={{ color: "#475569", weight: 4, opacity: 0.7, dashArray: "8 6" }}
        />
      )}

      {/* Ruta fresca (naranja, encima) */}
      {rutaFrescaCoords && (
        <Polyline
          positions={rutaFrescaCoords}
          pathOptions={{ color: "#fb923c", weight: 5, opacity: 0.95 }}
        >
          <Popup>
            <strong>🌿 Ruta fresca</strong><br />
            {ruta.ruta_fresca.properties.longitud_total_m} m ·{" "}
            {ruta.ruta_fresca.properties.porcentaje_sombra}% en sombra
          </Popup>
        </Polyline>
      )}

      {/* Marcador origen */}
      {origen && (
        <Marker position={[origen.lat, origen.lng]} icon={iconoPunto("#4ade80", "A")}>
          <Popup>📍 Origen</Popup>
        </Marker>
      )}

      {/* Marcador destino */}
      {destino && (
        <Marker position={[destino.lat, destino.lng]} icon={iconoPunto("#f87171", "B")}>
          <Popup>🏁 Destino</Popup>
        </Marker>
      )}

      {/* ── Refugios climáticos ── */}
      {modo === "refugios" &&
        refugios.map((r) => (
          <Marker key={`${r.tipo}-${r.id}`} position={[r.lat, r.lon]} icon={iconoRefugio(r.tipo)}>
            <Popup>
              <div style={{ minWidth: "180px" }}>
                <strong>{TIPO_ICONOS[r.tipo]} {r.nombre}</strong><br />
                <span style={{ color: "#64748b", fontSize: "0.85em" }}>{r.tipo_label}</span><br />
                {r.direccion && <span style={{ fontSize: "0.85em" }}>{r.direccion}</span>}
                {r.distancia_m && <div style={{ marginTop: "4px", color: "#0ea5e9" }}>📍 {r.distancia_m} m</div>}
              </div>
            </Popup>
          </Marker>
        ))}

      {/* ── Estaciones de calidad del aire ── */}
      {modo === "sombra" &&
        estacionesAire.map((e) => (
          <Marker key={`aire-${e.id}`} position={[e.lat, e.lon]} icon={iconoAire(e.indice_calidad)}>
            <Popup>
              <div style={{ minWidth: "160px" }}>
                <strong>{e.nombre}</strong><br />
                <span>Calidad: <b>{e.indice_calidad}</b></span><br />
                {e.no2  != null && <span>NO₂: {e.no2} µg/m³<br /></span>}
                {e.o3   != null && <span>O₃: {e.o3} µg/m³<br /></span>}
                {e.pm10 != null && <span>PM10: {e.pm10} µg/m³</span>}
              </div>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}
