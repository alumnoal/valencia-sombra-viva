import { useState, useEffect, useCallback } from "react";
import { getSunPosition } from "../services/api";

export function useSol(lat = 39.4699, lon = -0.3763) {
  const [sol, setSol] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refrescar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSunPosition(lat, lon);
      setSol(data);
    } catch (e) {
      setError("No se pudo conectar con el backend. ¿Está corriendo en el puerto 8000?");
    } finally {
      setLoading(false);
    }
  }, [lat, lon]);

  useEffect(() => {
    refrescar();
    const interval = setInterval(refrescar, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refrescar]);

  return { sol, loading, error, refrescar };
}
