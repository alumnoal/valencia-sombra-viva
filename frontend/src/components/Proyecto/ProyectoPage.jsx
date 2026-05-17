import React, { useRef } from 'react';

const PASOS = [
  {
    num: '01',
    titulo: 'Raster de superficies 2m',
    cuerpo:
      'Fusionamos las hojas CNIG MDS02 0722 y 0747 en un único Cloud-Optimized GeoTIFF de 488 MB (14.962 × 18.974 px). Cada píxel es 2 × 2 m y codifica la cota de la superficie —edificios, arbolado, infraestructura— sobre el elipsoide ETRS89 (EPSG:25830). No hay modelo simplificado: el ray-casting trabaja sobre el LiDAR real.',
  },
  {
    num: '02',
    titulo: 'Posición solar en tiempo real',
    cuerpo:
      'PySolar calcula azimut y elevación para las coordenadas y la hora UTC exacta en que se lanza la consulta. Sin bandas horarias precalculadas, sin interpolación: el sol está donde está ahora mismo. Cuando la elevación solar es ≤ 0°, el sistema retorna sombra total (noche o crepúsculo).',
  },
  {
    num: '03',
    titulo: 'Ray-casting sobre el MDS',
    cuerpo:
      'Para cada punto consultado se lanzan 9 rayos hacia el sol: 1 central y 8 satélite distribuidos a 4 m de radio. Cada rayo avanza 5 m por paso hasta 200 m de distancia; si la superficie intersecta el rayo por encima de la altura de vuelo, el punto queda en sombra. La fracción de rayos bloqueados × 100 es el índice 0–100.',
  },
  {
    num: '04',
    titulo: 'Grafo peatonal de Valencia',
    cuerpo:
      'osmnx descarga la red peatonal del área urbana central (centro histórico, Eixample, Ruzafa, Benimaclet: lat 39.445–39.495, lon −0.400–−0.340) y proyecta 25.394 nodos y 80.698 aristas a UTM 30N. El grafo se serializa a pickle (11 MB) y se aloja en HuggingFace para descarga única al arrancar el servidor.',
  },
  {
    num: '05',
    titulo: 'Dijkstra ponderado por sombra',
    cuerpo:
      'La ruta fresca usa un Dijkstra modificado donde el coste de cada arista es distancia × (1 + peso_sombra × (1 − fracción_sombra)). Con peso_sombra = 2, el algoritmo acepta hasta el doble de distancia si el tramo está completamente en sombra. La ruta corta convencional se calcula en paralelo como referencia.',
  },
  {
    num: '06',
    titulo: 'Red de refugios climáticos',
    cuerpo:
      '1.067 puntos extraídos de cinco datasets abiertos del Ayuntamiento de Valencia y Open Data VLCi, clasificados en cinco tipologías: fuentes PUSDAR, bibliotecas, centros de mayores, farmacias y hospitales. Se ordenan por distancia euclídea desde el punto de consulta y se filtran por radio configurable (por defecto 800 m).',
  },
];

const FUENTES = [
  { cat: 'Topografía', nombre: 'MDS02 2m (hojas 0722 / 0747)', proveedor: 'CNIG Centro de Descargas', uso: 'Ray-casting de sombras', cc: 'IDEE' },
  { cat: 'Aire', nombre: 'Red Valenciana de Vigilancia (RVVCCA)', proveedor: 'Geoportal Valencia · capa 156', uso: 'Índice de calidad del aire', cc: 'CC BY 4.0' },
  { cat: 'Refugios', nombre: 'Recursos sociales para mayores', proveedor: 'Geoportal Valencia · SS_MAYORES.json', uso: 'Centros de mayores como refugio', cc: 'CC BY 4.0' },
  { cat: 'Refugios', nombre: 'Equipamientos municipales', proveedor: 'Geoportal Valencia · v_infociudad.json', uso: 'Bibliotecas como refugio fresco', cc: 'CC BY 4.0' },
  { cat: 'Refugios', nombre: 'Fuentes de agua pública', proveedor: 'Geoportal Valencia · capa 158', uso: 'Puntos de hidratación', cc: 'CC BY 4.0' },
  { cat: 'Refugios', nombre: 'Fuentes PUSDAR (agua refrigerada)', proveedor: 'Open Data VLCi', uso: '25 fuentes de agua fría', cc: 'CC BY 4.0' },
  { cat: 'Refugios', nombre: 'Hospitales y centros de salud', proveedor: 'Open Data VLCi', uso: 'Refugios de guardia 24h', cc: 'CC BY 4.0' },
  { cat: 'Demografía', nombre: 'Padrón por manzana catastral', proveedor: 'Geoportal Valencia · MANZANAS.json', uso: 'Vulnerabilidad por edad (> 65 años)', cc: 'CC BY 4.0' },
  { cat: 'Vialidad', nombre: 'Red peatonal OpenStreetMap', proveedor: 'OpenStreetMap contributors', uso: 'Grafo de calles para el routing', cc: 'ODbL' },
];

const CAT_COLOR = {
  Topografía:  '#FF6B1A',
  Aire:        '#60A5FA',
  Refugios:    '#4ADE80',
  Demografía:  '#C084FC',
  Vialidad:    '#FACC15',
};

export default function ProyectoPage({ onContinuar }) {
  const fuentesRef = useRef(null);

  return (
    <div style={css.root}>
      {/* Barra fija */}
      <div style={css.topBar}>
        <span style={css.topLogo}>
          <SunsetIcon size={14} />
          Valencia Sombra Viva
        </span>
        <button style={css.topCta} onClick={onContinuar}>
          Abrir el mapa →
        </button>
      </div>

      {/* Intro */}
      <section style={css.intro}>
        <p style={css.introLabel}>Proyecto · datos abiertos · 2026</p>
        <h1 style={css.introH1}>
          Física del calor,<br />mapeada en tiempo real
        </h1>
        <p style={css.introDesc}>
          Valencia Sombra Viva calcula la sombra real proyectada por los edificios de la ciudad
          usando datos LiDAR del CNIG y la posición solar exacta de cada momento.
          Sin modelos estimados. Sin bandas horarias precalculadas.
        </p>
        <div style={css.introPills}>
          <Pill>488 MB · raster MDS 2m</Pill>
          <Pill>25.394 nodos OSM</Pill>
          <Pill>1.067 refugios</Pill>
          <Pill>9 fuentes abiertas</Pill>
        </div>
        <button style={css.scrollHint} onClick={() => fuentesRef.current?.scrollIntoView({ behavior: 'smooth' })}>
          Ver fuentes de datos ↓
        </button>
      </section>

      <Divider label="El mecanismo" />

      {/* Pasos */}
      <section style={css.pasosGrid}>
        {PASOS.map((p) => (
          <div key={p.num} style={css.pasoCard}>
            <span style={css.pasoNum}>{p.num}</span>
            <h3 style={css.pasoTitulo}>{p.titulo}</h3>
            <p style={css.pasoCuerpo}>{p.cuerpo}</p>
          </div>
        ))}
      </section>

      <Divider label="Las fuentes" ref={fuentesRef} />

      {/* Tabla de fuentes */}
      <section style={css.fuentesSection}>
        <p style={css.fuentesSubtitle}>
          Todo el proyecto se construye exclusivamente sobre datos de acceso público.
          Ningún dataset requiere licencia comercial ni registro.
        </p>
        <div style={css.fuentesTable}>
          <div style={css.fuentesHeader}>
            <span>Categoría</span>
            <span>Dataset</span>
            <span>Proveedor</span>
            <span>Uso</span>
            <span>Licencia</span>
          </div>
          {FUENTES.map((f, i) => (
            <div key={i} style={{ ...css.fuentesRow, ...(i % 2 === 1 ? css.fuentesRowAlt : {}) }}>
              <span>
                <span style={{ ...css.catDot, background: CAT_COLOR[f.cat] ?? '#888' }} />
                {f.cat}
              </span>
              <span style={css.fuentesNombre}>{f.nombre}</span>
              <span style={css.fuentesProveedor}>{f.proveedor}</span>
              <span style={css.fuentesUso}>{f.uso}</span>
              <span style={css.fuentesLic}>{f.cc}</span>
            </div>
          ))}
        </div>

        {/* Leyenda categorías */}
        <div style={css.catLegend}>
          {Object.entries(CAT_COLOR).map(([cat, color]) => (
            <span key={cat} style={css.catLegendItem}>
              <span style={{ ...css.catDot, background: color }} />{cat}
            </span>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section style={css.ctaSection}>
        <p style={css.ctaLabel}>¿Todo listo?</p>
        <h2 style={css.ctaTitle}>Empieza a navegar el calor de Valencia</h2>
        <button
          className="anim-glow-btn"
          style={css.ctaBtn}
          onClick={onContinuar}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          Abrir el mapa
        </button>
        <p style={css.ctaAyto}>
          Presentado a los{' '}
          <span style={{ color: '#FF6B1A' }}>Premios Datos Abiertos Valencia 2026</span>
          {' '}— Ricardo González Alonso · UC3M
        </p>
      </section>
    </div>
  );
}

/* ── Subcomponentes ─────────────────────────────────── */

function Pill({ children }) {
  return <span style={css.pill}>{children}</span>;
}

const Divider = React.forwardRef(function Divider({ label }, ref) {
  return (
    <div ref={ref} style={css.divider}>
      <span style={css.dividerLine} />
      <span style={css.dividerLabel}>{label}</span>
      <span style={css.dividerLine} />
    </div>
  );
});

const SunsetIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#FF6B1A">
    <path d="M23,14a1,1,0,0,1-1,1H2a1,1,0,0,1,0-2H22A1,1,0,0,1,23,14Zm-3,3.5a1,1,0,0,0-1-1H5a1,1,0,0,0,0,2H19A1,1,0,0,0,20,17.5ZM8,20a1,1,0,0,0,0,2h8a1,1,0,0,0,0-2ZM4,12a1,1,0,0,0,1-1,7,7,0,0,1,14,0,1,1,0,0,0,2,0A9,9,0,0,0,3,11,1,1,0,0,0,4,12Z"/>
  </svg>
);

/* ── Estilos ─────────────────────────────────────────── */

const css = {
  root: {
    minHeight: '100vh',
    background: '#070709',
    overflowY: 'auto',
    fontFamily: 'inherit',
    color: '#F0F0F0',
  },

  /* Barra fija */
  topBar: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.7rem 1.5rem',
    background: 'rgba(7,7,9,0.92)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(255,107,26,0.1)',
  },
  topLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.72rem',
    fontWeight: '700',
    color: '#FF6B1A',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  topCta: {
    padding: '0.35rem 1rem',
    borderRadius: '100px',
    border: '1px solid rgba(255,107,26,0.4)',
    background: 'transparent',
    color: '#FF6B1A',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
    letterSpacing: '0.02em',
  },

  /* Intro */
  intro: {
    maxWidth: '720px',
    margin: '0 auto',
    padding: 'clamp(3rem, 8vw, 6rem) 1.5rem 2.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.1rem',
  },
  introLabel: {
    fontSize: '0.7rem',
    fontWeight: '600',
    color: '#FF6B1A',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
  },
  introH1: {
    fontSize: 'clamp(2rem, 4.5vw, 3.2rem)',
    fontWeight: '700',
    lineHeight: 1.1,
    letterSpacing: '-0.03em',
    color: '#F0F0F0',
  },
  introDesc: {
    fontSize: '1rem',
    color: '#6B7A8D',
    lineHeight: 1.7,
    maxWidth: '580px',
  },
  introPills: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    marginTop: '0.3rem',
  },
  pill: {
    padding: '0.3rem 0.8rem',
    borderRadius: '100px',
    border: '1px solid rgba(255,107,26,0.25)',
    background: 'rgba(255,107,26,0.06)',
    color: '#FF6B1A',
    fontSize: '0.75rem',
    fontWeight: '500',
    letterSpacing: '0.03em',
  },
  scrollHint: {
    alignSelf: 'flex-start',
    marginTop: '0.5rem',
    background: 'none',
    border: 'none',
    color: '#3D4756',
    fontSize: '0.78rem',
    letterSpacing: '0.05em',
    cursor: 'pointer',
    fontFamily: 'inherit',
    padding: 0,
  },

  /* Divider */
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0 1.5rem',
    maxWidth: '1080px',
    margin: '1rem auto 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: 'rgba(255,255,255,0.06)',
  },
  dividerLabel: {
    fontSize: '0.68rem',
    fontWeight: '700',
    color: '#FF6B1A',
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  },

  /* Pasos */
  pasosGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '1px',
    maxWidth: '1080px',
    margin: '2rem auto 0',
    padding: '0 1.5rem',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '16px',
    overflow: 'hidden',
  },
  pasoCard: {
    background: '#0C0C10',
    padding: '1.75rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  pasoNum: {
    fontSize: '0.65rem',
    fontWeight: '700',
    color: '#FF6B1A',
    letterSpacing: '0.15em',
  },
  pasoTitulo: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#E0E0E0',
    letterSpacing: '-0.01em',
  },
  pasoCuerpo: {
    fontSize: '0.82rem',
    color: '#5A6578',
    lineHeight: 1.7,
  },

  /* Fuentes */
  fuentesSection: {
    maxWidth: '1080px',
    margin: '2rem auto 0',
    padding: '0 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  fuentesSubtitle: {
    fontSize: '0.88rem',
    color: '#5A6578',
    lineHeight: 1.6,
    maxWidth: '580px',
  },
  fuentesTable: {
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    overflow: 'hidden',
    fontSize: '0.78rem',
  },
  fuentesHeader: {
    display: 'grid',
    gridTemplateColumns: '110px 1fr 1.2fr 1fr 80px',
    gap: '0',
    padding: '0.65rem 1rem',
    background: 'rgba(255,107,26,0.05)',
    color: '#FF6B1A',
    fontWeight: '600',
    letterSpacing: '0.06em',
    fontSize: '0.68rem',
    textTransform: 'uppercase',
  },
  fuentesRow: {
    display: 'grid',
    gridTemplateColumns: '110px 1fr 1.2fr 1fr 80px',
    gap: '0',
    padding: '0.75rem 1rem',
    alignItems: 'center',
    borderTop: '1px solid rgba(255,255,255,0.04)',
  },
  fuentesRowAlt: {
    background: 'rgba(255,255,255,0.015)',
  },
  fuentesNombre: {
    color: '#D0D0D0',
    fontWeight: '500',
  },
  fuentesProveedor: {
    color: '#5A6578',
  },
  fuentesUso: {
    color: '#5A6578',
  },
  fuentesLic: {
    color: '#3D4756',
    fontSize: '0.7rem',
    fontWeight: '500',
  },
  catDot: {
    display: 'inline-block',
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    marginRight: '0.4rem',
    flexShrink: 0,
  },
  catLegend: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1rem',
    padding: '0.25rem 0',
  },
  catLegendItem: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.72rem',
    color: '#5A6578',
  },

  /* CTA final */
  ctaSection: {
    maxWidth: '720px',
    margin: '0 auto',
    padding: 'clamp(3rem, 8vw, 6rem) 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    textAlign: 'center',
  },
  ctaLabel: {
    fontSize: '0.7rem',
    fontWeight: '600',
    color: '#FF6B1A',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
  },
  ctaTitle: {
    fontSize: 'clamp(1.5rem, 3.5vw, 2.4rem)',
    fontWeight: '700',
    letterSpacing: '-0.025em',
    color: '#F0F0F0',
    lineHeight: 1.15,
  },
  ctaBtn: {
    marginTop: '0.8rem',
    padding: '0.9rem 2.8rem',
    borderRadius: '100px',
    border: '1px solid rgba(255,107,26,0.45)',
    background: '#FF6B1A',
    color: '#070709',
    fontSize: '0.95rem',
    fontWeight: '700',
    cursor: 'pointer',
    letterSpacing: '0.02em',
    fontFamily: 'inherit',
    transition: 'transform 0.2s ease',
  },
  ctaAyto: {
    fontSize: '0.75rem',
    color: '#3D4756',
    letterSpacing: '0.03em',
    marginTop: '0.5rem',
  },
};
