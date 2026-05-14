import React from "react";

const TIPO_LABEL = {
  fuente: "💧 Fuente",
  biblioteca: "📚 Biblioteca",
  centro_mayores: "🏠 Ctr. Mayores",
  farmacia: "💊 Farmacia",
};

const TIPO_COLOR = {
  fuente: "#38bdf8",
  biblioteca: "#a78bfa",
  centro_mayores: "#FF6B1A",
  farmacia: "#4ade80",
};

function IndiceBar({ valor }) {
  const color = valor > 60 ? "#FF6B1A" : valor > 30 ? "#FFB800" : "#f87171";
  const label = valor > 60 ? "Zona con sombra" : valor > 30 ? "Exposición media" : "Pleno sol";
  return (
    <div style={{ marginTop: "0.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
        <span style={s.muted}>Índice de sombra</span>
        <span style={{ fontSize: "0.85rem", fontWeight: 700, color }}>{valor} / 100</span>
      </div>
      <div style={{ height: "6px", borderRadius: "4px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ width: `${valor}%`, height: "100%", background: color, borderRadius: "4px", transition: "width 0.4s" }} />
      </div>
      <div style={{ fontSize: "0.72rem", color, marginTop: "0.2rem" }}>{label}</div>
    </div>
  );
}

function Step({ n, activo, hecho, label }) {
  const color = hecho ? "#4ade80" : activo ? "#FF6B1A" : "#3D4756";
  return (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", marginBottom: "0.4rem" }}>
      <div style={{
        width: "18px", minWidth: "18px", height: "18px", borderRadius: "50%",
        background: hecho ? "#4ade80" : activo ? "#FF6B1A" : "rgba(255,255,255,0.06)",
        color: hecho || activo ? "#070709" : "#3D4756",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "0.65rem", fontWeight: "700", marginTop: "1px",
      }}>{hecho ? "✓" : n}</div>
      <span style={{ fontSize: "0.78rem", color, lineHeight: "1.4" }}>{label}</span>
    </div>
  );
}

function Row({ label, value, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.15rem" }}>
      <span style={{ color: "#4A5568" }}>{label}</span>
      <span style={{ color: color || "#D0D8E4" }}>{value}</span>
    </div>
  );
}

function PanelRuta({ origen, destino, ruta, rutaLoading, rutaError, onReset }) {
  const pasoActual = !origen ? 1 : !destino ? 2 : 3;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      <div style={s.card}>
        <div style={s.cardTitle}>Ruta fresca</div>
        <Step n={1} activo={pasoActual === 1} hecho={!!origen}
          label={origen ? `Origen: ${origen.lat.toFixed(4)}, ${origen.lng.toFixed(4)}` : "Clic en el mapa para marcar origen"} />
        <Step n={2} activo={pasoActual === 2} hecho={!!destino}
          label={destino ? `Destino: ${destino.lat.toFixed(4)}, ${destino.lng.toFixed(4)}` : "Clic en el mapa para marcar destino"} />
        <div style={{ fontSize: "0.68rem", color: "#3D4756", marginTop: "0.2rem", lineHeight: 1.4 }}>
          Zona cubierta: centro urbano de Valencia (centro histórico, Eixample, Ruzafa, Benimaclet)
        </div>
        {origen && (
          <button onClick={onReset} style={s.btnReset}>✕ Resetear</button>
        )}
      </div>

      {rutaLoading && (
        <div style={s.card}>
          <div style={s.muted}>⏳ Calculando ruta fresca…</div>
          <div style={{ fontSize: "0.72rem", color: "#3D4756", marginTop: "0.3rem" }}>
            Primera vez puede tardar ~20s (descargando callejero OSM)
          </div>
        </div>
      )}

      {rutaError && <div style={s.errorBox}>⚠️ {rutaError}</div>}

      {ruta && !rutaLoading && ruta.ruta_fresca && (
        <>
          <div style={{ ...s.card, borderLeft: "2px solid #FF6B1A" }}>
            <div style={{ ...s.cardTitle, color: "#FF6B1A" }}>Ruta fresca</div>
            <Row label="Distancia" value={`${ruta.ruta_fresca.properties.longitud_total_m} m`} />
            <Row label="% en sombra" value={`${ruta.ruta_fresca.properties.porcentaje_sombra}%`} />
          </div>

          <div style={{ ...s.card, borderLeft: "2px solid rgba(255,255,255,0.12)" }}>
            <div style={{ ...s.cardTitle, color: "#5A6578" }}>Ruta más corta</div>
            <Row label="Distancia" value={`${ruta.ruta_corta.properties.longitud_total_m} m`} />
            <Row label="% en sombra" value={`${ruta.ruta_corta.properties.porcentaje_sombra}%`} />
          </div>

          <div style={s.card}>
            <div style={s.cardTitle}>Comparativa</div>
            <Row
              label="Metros extra"
              value={`+${ruta.comparativa.metros_extra} m`}
              color={ruta.comparativa.metros_extra < 200 ? "#4ade80" : ruta.comparativa.metros_extra < 500 ? "#FF6B1A" : "#f87171"}
            />
            <Row label="Sombra ganada" value={`+${ruta.comparativa.puntos_sombra_extra}%`} color="#38bdf8" />
            <div style={{
              marginTop: "0.5rem", padding: "0.4rem 0.6rem", borderRadius: "6px",
              background: ruta.comparativa.merece_la_pena ? "rgba(74,222,128,0.08)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${ruta.comparativa.merece_la_pena ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.06)"}`,
              fontSize: "0.78rem",
              color: ruta.comparativa.merece_la_pena ? "#4ade80" : "#3D4756",
            }}>
              {ruta.comparativa.merece_la_pena
                ? "✅ Merece la pena: más sombra sin mucho rodeo"
                : "ℹ️ El desvío no compensa en este trayecto"}
            </div>
          </div>

          {ruta.sol && (
            <div style={s.card}>
              <div style={s.cardTitle}>Sol en el momento</div>
              <Row label="Elevación" value={`${ruta.sol.elevacion}°`} />
              <Row label="Azimut" value={`${ruta.sol.azimut}°`} />
              {!ruta.sol.es_de_dia && (
                <div style={{ fontSize: "0.72rem", color: "#3D4756", marginTop: "0.3rem" }}>
                  🌙 Noche — ambas rutas son equivalentes
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function RutaFresca({
  modo, sol, solLoading, solError,
  refugios, refugiosLoading, refugiosError,
  puntoSeleccionado, indice,
  origen, destino, ruta, rutaLoading, rutaError, onResetRuta,
}) {
  if (modo === "ruta") {
    return (
      <PanelRuta
        origen={origen} destino={destino}
        ruta={ruta} rutaLoading={rutaLoading} rutaError={rutaError}
        onReset={onResetRuta}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>

      {solError && <div style={s.errorBox}>⚠️ {solError}</div>}

      <div style={s.card}>
        <div style={s.cardTitle}>Sol ahora en Valencia</div>
        {solLoading ? (
          <div style={s.muted}>Calculando...</div>
        ) : sol ? (
          <>
            <Row label="Azimut"     value={`${sol.azimuth?.toFixed(1)}°`} />
            <Row label="Elevación"  value={`${sol.elevation?.toFixed(1)}°`} />
            {sol.is_daytime && (
              <Row
                label="Sombra /10m"
                value={sol.shadow_length_per_10m > 500 ? "muy larga" : `${sol.shadow_length_per_10m?.toFixed(0)} m`}
              />
            )}
            {sol.elevacion_mdt_m && <Row label="Altitud MDT" value={`${sol.elevacion_mdt_m} m`} />}
            <div style={{ marginTop: "0.4rem", fontSize: "0.75rem", color: sol.is_daytime ? "#FF6B1A" : "#3D4756" }}>
              {sol.is_daytime ? "Hay luz solar" : "🌙 Sin luz solar"}
            </div>
          </>
        ) : (
          <div style={s.muted}>Sin datos del backend</div>
        )}
      </div>

      {puntoSeleccionado && indice && (
        <div style={s.card}>
          <div style={s.cardTitle}>Punto seleccionado</div>
          {indice.elevacion_superficie_m && <Row label="Altitud" value={`${indice.elevacion_superficie_m} m`} />}
          <IndiceBar valor={indice.indice_sombra} />
          {indice.muestras_bloqueadas != null && (
            <div style={{ fontSize: "0.72rem", color: "#3D4756", marginTop: "0.3rem" }}>
              {indice.muestras_bloqueadas}/{indice.muestras_total} muestras en sombra · fuente: {indice.fuente}
            </div>
          )}
        </div>
      )}

      {modo === "refugios" && (
        <div>
          <div style={{ ...s.cardTitle, marginBottom: "0.5rem" }}>
            Refugios climáticos
            <span style={s.badge}>{refugios.length}</span>
          </div>
          {refugiosError ? (
            <div style={s.errorBox}>⚠️ {refugiosError}</div>
          ) : refugiosLoading ? (
            <div style={s.muted}>Buscando refugios...</div>
          ) : refugios.length === 0 ? (
            <div style={s.muted}>No se encontraron refugios en 1 km.</div>
          ) : (
            <>
              <div style={{ fontSize: "0.72rem", color: "#3D4756", marginBottom: "0.4rem" }}>
                En 1 km · {puntoSeleccionado ? "tu punto" : "centro de Valencia"}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                {refugios.slice(0, 15).map((r) => (
                  <div key={`${r.tipo}-${r.id}`} style={s.refugioItem}>
                    <div style={{
                      width: "7px", minWidth: "7px", height: "7px", borderRadius: "50%",
                      background: TIPO_COLOR[r.tipo] || "#5A6578", marginTop: "5px",
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.8rem", color: "#D0D8E4", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.nombre}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "#3D4756" }}>
                        {TIPO_LABEL[r.tipo]} · {r.distancia_m} m
                      </div>
                    </div>
                  </div>
                ))}
                {refugios.length > 15 && (
                  <div style={{ fontSize: "0.72rem", color: "#3D4756", textAlign: "center" }}>
                    +{refugios.length - 15} más visibles en el mapa
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {modo === "sombra" && !puntoSeleccionado && (
        <div style={{ padding: "0.25rem 0.1rem", display: "flex", flexDirection: "column", gap: "0.55rem" }}>
          <p style={{ fontSize: "0.78rem", color: "#3D4756", lineHeight: "1.75" }}>
            Toca el mapa para ver el índice de sombra y la calidad del aire en ese punto.
          </p>
          <p style={{ fontSize: "0.78rem", color: "#3D4756", lineHeight: "1.75" }}>
            Usa <span style={{ color: "#FF6B1A" }}>Ruta fresca</span> para calcular el camino más fresco entre dos puntos.
          </p>
        </div>
      )}
    </div>
  );
}

const s = {
  card: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "10px",
    padding: "0.75rem",
  },
  cardTitle: {
    fontSize: "0.82rem", fontWeight: "600", color: "#D0D8E4",
    marginBottom: "0.45rem", display: "flex", alignItems: "center", gap: "0.4rem",
  },
  muted: { fontSize: "0.78rem", color: "#4A5568" },
  badge: {
    background: "rgba(255,107,26,0.12)", color: "#FF6B1A",
    borderRadius: "10px", padding: "0.1rem 0.45rem", fontSize: "0.7rem",
  },
  refugioItem: {
    display: "flex", gap: "0.5rem", padding: "0.35rem 0.5rem",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.04)",
    borderRadius: "6px", alignItems: "flex-start",
  },
  errorBox: {
    background: "rgba(239,68,68,0.07)",
    border: "1px solid rgba(239,68,68,0.2)",
    borderRadius: "8px", padding: "0.5rem 0.7rem",
    fontSize: "0.78rem", color: "#f87171",
  },
  btnReset: {
    marginTop: "0.4rem", width: "100%", padding: "0.3rem", borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.08)", background: "transparent",
    color: "#4A5568", cursor: "pointer", fontSize: "0.75rem", fontFamily: "inherit",
  },
};
