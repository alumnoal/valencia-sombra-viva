import React, { useState, useEffect, useCallback } from "react";
import MapView from "./components/Map/MapView";
import RutaFresca from "./components/RutaFresca/RutaFresca";
import AlertaCalor from "./components/AlertaCalor/AlertaCalor";
import LandingPage from "./components/Landing/LandingPage";
import Tutorial from "./components/Tutorial/Tutorial";
import { useSol } from "./hooks/useSol";
import { useRefugios } from "./hooks/useRefugios";
import { getEstacionesAire, getResumenAire, getIndiceSombra, getRutaFresca } from "./services/api";

// Modos del mapa:
// "sombra"  → clic para ver índice de sombra + calidad del aire
// "ruta"    → primer clic = origen, segundo = destino, calcula ruta fresca
// "refugios"→ muestra refugios climáticos cercanos

function useIsMobile() {
  const [mob, setMob] = useState(() => window.innerWidth < 700);
  useEffect(() => {
    const h = () => setMob(window.innerWidth < 700);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return mob;
}

const SunsetLogo = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="#FF6B1A">
    <path d="M23,14a1,1,0,0,1-1,1H2a1,1,0,0,1,0-2H22A1,1,0,0,1,23,14Zm-3,3.5a1,1,0,0,0-1-1H5a1,1,0,0,0,0,2H19A1,1,0,0,0,20,17.5ZM8,20a1,1,0,0,0,0,2h8a1,1,0,0,0,0-2ZM4,12a1,1,0,0,0,1-1,7,7,0,0,1,14,0,1,1,0,0,0,2,0A9,9,0,0,0,3,11,1,1,0,0,0,4,12Z"/>
  </svg>
);

function MainApp() {
  const [modo, setModo] = useState("sombra");
  const [mapaOscuro, setMapaOscuro] = useState(false);
  const isMobile = useIsMobile();
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [puntoSeleccionado, setPuntoSeleccionado] = useState(null);
  const [indice, setIndice] = useState(null);
  const [estacionesAire, setEstacionesAire] = useState([]);
  const [resumenAire, setResumenAire] = useState(null);

  // Estado de routing
  const [origen, setOrigen] = useState(null);
  const [destino, setDestino] = useState(null);
  const [ruta, setRuta] = useState(null);       // respuesta completa del backend
  const [rutaLoading, setRutaLoading] = useState(false);
  const [rutaError, setRutaError] = useState(null);

  const { sol, loading: solLoading, error: solError } = useSol(
    puntoSeleccionado?.lat ?? 39.4699,
    puntoSeleccionado?.lng ?? -0.3763
  );

  const { refugios, loading: refugiosLoading, error: refugiosError } = useRefugios(
    puntoSeleccionado?.lat,
    puntoSeleccionado?.lng,
    modo === "refugios"
  );

  useEffect(() => {
    getEstacionesAire().then(setEstacionesAire).catch(() => {});
    getResumenAire().then(setResumenAire).catch(() => {});
  }, []);

  // Resetear ruta al cambiar de modo
  useEffect(() => {
    if (modo !== "ruta") {
      setOrigen(null);
      setDestino(null);
      setRuta(null);
      setRutaError(null);
    }
    if (modo !== "sombra") {
      setPuntoSeleccionado(null);
      setIndice(null);
    }
  }, [modo]);

  const calcularRuta = useCallback(async (org, dst) => {
    setRutaLoading(true);
    setRutaError(null);
    setRuta(null);
    try {
      const data = await getRutaFresca({
        originLat: org.lat, originLon: org.lng,
        destLat: dst.lat,   destLon: dst.lng,
      });
      if (data?.error) {
        setRutaError(data.error);
      } else {
        setRuta(data);
      }
    } catch (e) {
      setRutaError(e?.response?.data?.detail ?? "Error calculando la ruta");
    } finally {
      setRutaLoading(false);
    }
  }, []);

  const handleMapClick = useCallback(async (latlng) => {
    if (modo === "sombra" || modo === "refugios") {
      setPuntoSeleccionado(latlng);
      setIndice(null);
      if (modo === "sombra") {
        try {
          const data = await getIndiceSombra(latlng.lat, latlng.lng);
          setIndice(data);
        } catch (e) {
          console.error(e);
        }
      }
      return;
    }

    // Modo ruta: primer clic = origen, segundo = destino
    if (modo === "ruta") {
      if (!origen) {
        setOrigen(latlng);
        setDestino(null);
        setRuta(null);
        setRutaError(null);
      } else if (!destino) {
        setDestino(latlng);
        calcularRuta(origen, latlng);
      } else {
        // Tercer clic: resetea y empieza de nuevo
        setOrigen(latlng);
        setDestino(null);
        setRuta(null);
        setRutaError(null);
      }
    }
  }, [modo, origen, destino, calcularRuta]);

  const resetRuta = useCallback(() => {
    setOrigen(null);
    setDestino(null);
    setRuta(null);
    setRutaError(null);
  }, []);

  const rutaFrescaProps = {
    modo, sol, solLoading, solError,
    refugios, refugiosLoading, refugiosError,
    puntoSeleccionado, indice,
    origen, destino, ruta, rutaLoading, rutaError, onResetRuta: resetRuta,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <header style={{
        ...styles.header,
        ...(isMobile ? { flexWrap: "wrap", padding: "0.5rem 0.85rem", gap: "0.5rem" } : {}),
      }}>
        <span style={{ ...styles.logo, ...(isMobile ? { flex: 1 } : {}) }}>
          <SunsetLogo />
          Valencia Sombra Viva
        </span>
        <div style={{ display: "flex", gap: "0.45rem", alignItems: "center" }}>
          <AlertaCalor nivel={resumenAire?.nivel_global} estacionesAlerta={resumenAire?.estaciones_en_alerta} />
          <button
            style={styles.mapToggle}
            onClick={() => setMapaOscuro(v => !v)}
            title={mapaOscuro ? "Cambiar a mapa claro" : "Cambiar a mapa oscuro"}
          >
            {mapaOscuro ? "☀️" : "🌙"}
          </button>
        </div>
        <nav style={{
          ...styles.nav,
          ...(isMobile ? { width: "100%", paddingBottom: "0.1rem" } : {}),
        }}>
          <button style={modo === "sombra"   ? styles.btnActive : styles.btn} onClick={() => setModo("sombra")}>Sombra</button>
          <button style={modo === "ruta"     ? styles.btnActive : styles.btn} onClick={() => setModo("ruta")}>Ruta fresca</button>
          <button style={modo === "refugios" ? styles.btnActive : styles.btn} onClick={() => setModo("refugios")}>Refugios</button>
        </nav>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>
        {!isMobile && (
          <aside style={styles.sidebar}>
            <RutaFresca {...rutaFrescaProps} />
          </aside>
        )}

        <main style={{ flex: 1, position: "relative" }}>
          <MapView
            modo={modo}
            mapaOscuro={mapaOscuro}
            refugios={modo === "refugios" ? refugios : []}
            estacionesAire={modo === "sombra" ? estacionesAire : []}
            puntoSeleccionado={modo === "sombra" || modo === "refugios" ? puntoSeleccionado : null}
            onMapClick={handleMapClick}
            origen={origen}
            destino={destino}
            ruta={ruta}
          />
          <div style={{ ...styles.leyenda, ...(isMobile ? { bottom: "58px", left: "8px" } : {}) }}>
            {modo === "refugios" ? (
              <>
                {[["💧","Fuente"],["📚","Biblioteca"],["🏠","Ctr. Mayores"],["💊","Farmacia"]].map(([e,l]) => (
                  <span key={l} style={styles.leyendaItem}>{e} {l}</span>
                ))}
              </>
            ) : modo === "ruta" ? (
              <>
                <span style={styles.leyendaItem}><span style={{...styles.dot, background:"#FF6B1A"}} /> Ruta fresca</span>
                <span style={styles.leyendaItem}><span style={{...styles.dot, background:"#475569"}} /> Ruta corta</span>
                {!isMobile && <span style={{...styles.leyendaItem, color:"#3D4756"}}>· 1er clic = origen · 2º clic = destino</span>}
              </>
            ) : (
              <>
                <span style={styles.leyendaItem}><span style={{...styles.dot, background:"#4ade80"}} /> Aire bueno</span>
                <span style={styles.leyendaItem}><span style={{...styles.dot, background:"#FF6B1A"}} /> Razonable</span>
                <span style={styles.leyendaItem}><span style={{...styles.dot, background:"#f87171"}} /> Malo</span>
                {!isMobile && <span style={{...styles.leyendaItem, color:"#3D4756"}}>· Clic en mapa → índice de sombra</span>}
              </>
            )}
          </div>
        </main>

        {isMobile && (
          <div style={{
            position: "fixed",
            bottom: 0, left: 0, right: 0,
            background: "#0C0C10",
            borderTop: "1px solid rgba(255,107,26,0.2)",
            borderRadius: "14px 14px 0 0",
            zIndex: 800,
            maxHeight: panelAbierto ? "62vh" : "50px",
            transition: "max-height 0.3s cubic-bezier(0.4,0,0.2,1)",
            overflow: "hidden",
            boxShadow: "0 -8px 32px rgba(0,0,0,0.55)",
          }}>
            <div
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 1rem", height: "50px", cursor: "pointer" }}
              onClick={() => setPanelAbierto(v => !v)}
            >
              <span style={{ fontSize: "0.82rem", color: "#FF6B1A", fontWeight: 600, letterSpacing: "0.04em" }}>
                {modo === "sombra" ? "Sombra" : modo === "ruta" ? "Ruta fresca" : "Refugios"}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <div style={{ width: "28px", height: "3px", background: "rgba(255,255,255,0.1)", borderRadius: "2px" }} />
                <span style={{ color: "#5A6578", fontSize: "1rem" }}>{panelAbierto ? "↓" : "↑"}</span>
              </div>
            </div>
            <div style={{ padding: "0 0.75rem 2rem", overflowY: "auto", maxHeight: "calc(62vh - 50px)" }}>
              <RutaFresca {...rutaFrescaProps} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  header: {
    display: "flex", alignItems: "center", gap: "1rem",
    padding: "0.55rem 1.2rem", background: "#0C0C10",
    borderBottom: "1px solid rgba(255,107,26,0.1)", zIndex: 1000, flexShrink: 0,
  },
  logo: {
    display: "flex", alignItems: "center", gap: "0.45rem",
    fontSize: "0.78rem", fontWeight: "700", color: "#FF6B1A",
    marginRight: "auto", letterSpacing: "0.1em", textTransform: "uppercase",
  },
  nav: { display: "flex", gap: "0.35rem" },
  btn: {
    padding: "0.32rem 0.9rem", borderRadius: "100px",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "transparent", color: "#5A6578",
    cursor: "pointer", fontSize: "0.82rem", fontFamily: "inherit",
  },
  btnActive: {
    padding: "0.32rem 0.9rem", borderRadius: "100px",
    border: "1px solid rgba(255,107,26,0.45)",
    background: "rgba(255,107,26,0.1)", color: "#FF6B1A",
    cursor: "pointer", fontSize: "0.82rem", fontWeight: "600", fontFamily: "inherit",
  },
  sidebar: {
    width: "280px", background: "#0C0C10",
    borderRight: "1px solid rgba(255,255,255,0.05)",
    overflowY: "auto", padding: "0.75rem", flexShrink: 0,
  },
  leyenda: {
    position: "absolute", bottom: "32px", left: "12px",
    background: "rgba(7,7,9,0.9)", borderRadius: "10px",
    padding: "0.5rem 0.75rem", display: "flex", flexWrap: "wrap", gap: "0.5rem",
    backdropFilter: "blur(8px)", zIndex: 500,
    border: "1px solid rgba(255,255,255,0.06)",
  },
  leyendaItem: { fontSize: "0.75rem", color: "#6B7A8D", display: "flex", alignItems: "center", gap: "0.3rem" },
  dot: { display: "inline-block", width: "10px", height: "10px", borderRadius: "50%" },
  mapToggle: {
    padding: "0.3rem 0.65rem", borderRadius: "100px",
    border: "1px solid rgba(255,255,255,0.1)",
    background: "transparent", color: "#5A6578",
    cursor: "pointer", fontSize: "0.85rem", lineHeight: 1,
  },
};

export default function App() {
  const [screen, setScreen] = useState(() =>
    localStorage.getItem('vsv-visited') ? 'app' : 'landing'
  );

  const enterApp = () => {
    localStorage.setItem('vsv-visited', '1');
    setScreen('app');
  };

  if (screen === 'landing') return <LandingPage onEnter={() => setScreen('tutorial')} />;
  if (screen === 'tutorial') return <Tutorial onDone={enterApp} onSkip={enterApp} />;
  return <MainApp />;
}
