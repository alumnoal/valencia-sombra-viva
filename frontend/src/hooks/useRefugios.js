import { useState, useEffect } from "react";
import { getRefugiosCercanos, getRefugiosAlertaCalor } from "../services/api";

const VALENCIA_DEFAULT = { lat: 39.4699, lon: -0.3763 };

export function useRefugios(lat, lon, activo = true) {
  const [refugios, setRefugios] = useState([]);
  const [alertaCalor, setAlertaCalor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Usar Valencia centro si no hay coords válidas
  const useLat = lat || VALENCIA_DEFAULT.lat;
  const useLon = lon || VALENCIA_DEFAULT.lon;

  useEffect(() => {
    if (!activo) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    getRefugiosCercanos(useLat, useLon, 1000)
      .then((data) => {
        if (!cancelled) setRefugios(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Error cargando refugios:", err);
          setError("No se pudieron cargar los refugios");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // Check alerta calor en paralelo
    getRefugiosAlertaCalor(useLat, useLon, 1500)
      .then((d) => {
        if (!cancelled) setAlertaCalor(d?.alerta_activa ?? false);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [useLat, useLon, activo]);

  return { refugios, alertaCalor, loading, error };
}
