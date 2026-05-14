import axios from "axios";

const BASE_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

const api = axios.create({ baseURL: `${BASE_URL}/api`, timeout: 10000 });
const apiLenta = axios.create({ baseURL: `${BASE_URL}/api`, timeout: 120000 }); // ruta fresca puede tardar

export async function getSunPosition(lat = 39.4699, lon = -0.3763) {
  const { data } = await api.get("/sombra/sol", { params: { lat, lon } });
  return data;
}

export async function getIndiceSombra(lat, lon) {
  const { data } = await api.get("/sombra/indice-sombra", { params: { lat, lon } });
  return data;
}

export async function getGridElevacion(latMin, lonMin, latMax, lonMax, stepM = 80) {
  const { data } = await api.get("/sombra/grid-elevacion", {
    params: { lat_min: latMin, lon_min: lonMin, lat_max: latMax, lon_max: lonMax, step_m: stepM },
  });
  return data;
}

export async function getRefugiosCercanos(lat, lon, radioM = 800, tipos = null) {
  const params = { lat, lon, radio_m: radioM };
  if (tipos) params.tipos = tipos;
  const { data } = await api.get("/refugios/cercanos", { params });
  return data;
}

export async function getRefugiosAlertaCalor(lat, lon, radioM = 1500) {
  const { data } = await api.get("/refugios/alerta-calor", {
    params: { lat, lon, radio_m: radioM },
  });
  return data;
}

export async function getResumenAire() {
  const { data } = await api.get("/aire/resumen");
  return data;
}

export async function getEstacionesAire() {
  const { data } = await api.get("/aire/tiempo-real");
  return data;
}

export async function getRutaFresca({ originLat, originLon, destLat, destLon, shadeWeight = 2.0 }) {
  const { data } = await apiLenta.post("/sombra/ruta-fresca", {
    origin_lat: originLat,
    origin_lon: originLon,
    dest_lat: destLat,
    dest_lon: destLon,
    shade_weight: shadeWeight,
  });
  return data;
}
