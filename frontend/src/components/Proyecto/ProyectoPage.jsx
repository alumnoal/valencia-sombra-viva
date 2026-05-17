import React, { useRef } from 'react';

/* ── Iconos por paso ─────────────────────────────────── */

const IconRaster = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
    {[0,1,2].map(r => [0,1,2].map(c => (
      <rect key={`${r}${c}`}
        x={4 + c * 10} y={4 + r * 10} width="8" height="8" rx="1"
        fill="#FF6B1A" opacity={0.25 + (r * 3 + c) * 0.083}
      />
    )))}
  </svg>
);

const IconSolar = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
    <circle cx="18" cy="18" r="6" fill="#FF6B1A"/>
    {[0,45,90,135,180,225,270,315].map((a, i) => {
      const r = Math.PI * a / 180;
      return <line key={i}
        x1={18 + 9 * Math.cos(r)} y1={18 + 9 * Math.sin(r)}
        x2={18 + 13 * Math.cos(r)} y2={18 + 13 * Math.sin(r)}
        stroke="#FF6B1A" strokeWidth="2" strokeLinecap="round"
      />;
    })}
  </svg>
);

const IconRay = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
    <circle cx="7" cy="7" r="3.5" fill="#FF6B1A"/>
    <rect x="22" y="4" width="10" height="28" rx="1" fill="#FF6B1A" opacity="0.4"/>
    {[6, 11, 16, 21, 26].map((y, i) => (
      <line key={i} x1="11" y1={y} x2="22" y2={8 + i * 4}
        stroke="#FF6B1A" strokeWidth="1.2" opacity={0.35 + i * 0.1}
        strokeDasharray="2 2"
      />
    ))}
    <circle cx="7" cy="7" r="3.5" fill="#FF6B1A"/>
  </svg>
);

const IconGraph = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
    {[[8,28],[18,8],[28,28],[18,20]].map(([x,y], i, arr) =>
      arr.slice(i+1).map(([x2,y2], j) => (
        <line key={`${i}${j}`} x1={x} y1={y} x2={x2} y2={y2}
          stroke="#FF6B1A" strokeWidth="1.5" opacity="0.3"/>
      ))
    )}
    {[[8,28],[18,8],[28,28],[18,20]].map(([x,y], i) => (
      <circle key={i} cx={x} cy={y} r="3.5" fill="#FF6B1A" opacity={i === 3 ? 0.5 : 1}/>
    ))}
  </svg>
);

const IconRoute = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
    <circle cx="8" cy="18" r="3" fill="#FF6B1A"/>
    <circle cx="28" cy="18" r="3" fill="#FF6B1A"/>
    <path d="M11 18 Q18 8 25 18" stroke="#FF6B1A" strokeWidth="2" fill="none" strokeLinecap="round"/>
    <path d="M11 18 Q18 28 25 18" stroke="#FF6B1A" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.35" strokeDasharray="3 2"/>
  </svg>
);

const IconRefugio = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
    <path d="M18 5 L32 16 L32 32 L4 32 L4 16 Z" fill="#FF6B1A" opacity="0.15" stroke="#FF6B1A" strokeWidth="1.5"/>
    <rect x="13" y="21" width="10" height="11" rx="1" fill="#FF6B1A" opacity="0.5"/>
    <circle cx="18" cy="14" r="3" fill="#FF6B1A"/>
  </svg>
);

const PASOS = [
  { num: '01', icon: <IconRaster />,  stat: '488 MB',    titulo: 'Raster MDS 2m',           cuerpo: 'CNIG LiDAR fusionado en Cloud-Optimized GeoTIFF. 14.962 × 18.974 px, un píxel = 2 × 2 m de superficie real con edificios y vegetación.' },
  { num: '02', icon: <IconSolar />,   stat: 'Tiempo real', titulo: 'Posición solar exacta', cuerpo: 'PySolar calcula azimut y elevación para la hora UTC de cada consulta. Sin bandas horarias precalculadas ni interpolación.' },
  { num: '03', icon: <IconRay />,     stat: '9 rayos',   titulo: 'Ray-casting sobre MDS',    cuerpo: '1 rayo central + 8 satélite a 4 m de radio. Cada rayo avanza 5 m hasta 200 m. Si el MDS bloquea el rayo → sombra.' },
  { num: '04', icon: <IconGraph />,   stat: '25.394 nodos', titulo: 'Grafo peatonal OSM',   cuerpo: 'Red peatonal del área central descargada con osmnx, proyectada a UTM 30N y serializada en pickle de 11 MB alojado en HuggingFace.' },
  { num: '05', icon: <IconRoute />,   stat: '× 2 dist.', titulo: 'Dijkstra × sombra',       cuerpo: 'cost = distancia × (1 + w × (1 − sombra)). El algoritmo acepta rutas más largas si tienen más sombra; w = 2 por defecto.' },
  { num: '06', icon: <IconRefugio />, stat: '1.067 pts', titulo: 'Red de refugios',          cuerpo: 'Cinco datasets abiertos de Valencia: fuentes PUSDAR, bibliotecas, centros de mayores, farmacias y hospitales.' },
];

const FUENTES = [
  { cat: 'Topografía', nombre: 'MDS02 2m (hojas 0722 / 0747)',         proveedor: 'CNIG Centro de Descargas',            cc: 'IDEE' },
  { cat: 'Aire',       nombre: 'Red Valenciana de Vigilancia RVVCCA',  proveedor: 'Geoportal Valencia · capa 156',        cc: 'CC BY 4.0' },
  { cat: 'Refugios',   nombre: 'Recursos sociales para mayores',        proveedor: 'Geoportal Valencia · SS_MAYORES.json', cc: 'CC BY 4.0' },
  { cat: 'Refugios',   nombre: 'Equipamientos municipales',             proveedor: 'Geoportal Valencia · v_infociudad.json', cc: 'CC BY 4.0' },
  { cat: 'Refugios',   nombre: 'Fuentes de agua pública',               proveedor: 'Geoportal Valencia · capa 158',        cc: 'CC BY 4.0' },
  { cat: 'Refugios',   nombre: 'Fuentes PUSDAR (agua refrigerada)',     proveedor: 'Open Data VLCi',                       cc: 'CC BY 4.0' },
  { cat: 'Refugios',   nombre: 'Hospitales y centros de salud',         proveedor: 'Open Data VLCi',                       cc: 'CC BY 4.0' },
  { cat: 'Demografía', nombre: 'Padrón por manzana catastral',          proveedor: 'Geoportal Valencia · MANZANAS.json',  cc: 'CC BY 4.0' },
  { cat: 'Vialidad',   nombre: 'Red peatonal OpenStreetMap',            proveedor: 'OpenStreetMap contributors',           cc: 'ODbL' },
];

const CAT_COLOR = {
  Topografía: '#FF6B1A', Aire: '#60A5FA', Refugios: '#4ADE80',
  Demografía: '#C084FC', Vialidad: '#FACC15',
};

/* ── Componente principal ────────────────────────────── */

export default function ProyectoPage({ onContinuar }) {
  const fuentesRef = useRef(null);

  return (
    <div style={css.root}>
      {/* Barra fija */}
      <div style={css.topBar}>
        <span style={css.topLogo}>
          <ValenciaIcon size={14} />
          Valencia Sombra Viva
        </span>
        <button style={css.topCta} onClick={onContinuar}>Abrir el mapa →</button>
      </div>

      {/* Intro */}
      <section style={css.intro}>
        <p style={css.introLabel}>Proyecto · datos abiertos · 2026</p>
        <h1 style={css.introH1}>
          Física del calor,<br />mapeada en tiempo real
        </h1>
        <p style={css.introDesc}>
          Sombra real proyectada por los edificios de Valencia usando datos LiDAR
          del CNIG y la posición solar exacta de cada momento.
          Sin modelos estimados. Sin bandas horarias precalculadas.
        </p>
        <div style={css.introPills}>
          <Pill>488 MB · MDS 2m</Pill>
          <Pill>25.394 nodos OSM</Pill>
          <Pill>1.067 refugios</Pill>
          <Pill>9 fuentes abiertas</Pill>
        </div>
        <button style={css.scrollHint}
          onClick={() => fuentesRef.current?.scrollIntoView({ behavior: 'smooth' })}>
          Ver fuentes de datos ↓
        </button>
      </section>

      <Divider label="El mecanismo" />

      {/* Pasos */}
      <section style={css.pasosGrid}>
        {PASOS.map((p) => (
          <div key={p.num} style={css.pasoCard}>
            <div style={css.pasoTop}>
              {p.icon}
              <span style={css.pasoStat}>{p.stat}</span>
            </div>
            <span style={css.pasoNum}>{p.num}</span>
            <h3 style={css.pasoTitulo}>{p.titulo}</h3>
            <p style={css.pasoCuerpo}>{p.cuerpo}</p>
          </div>
        ))}
      </section>

      <Divider label="Las fuentes" ref={fuentesRef} />

      {/* Tabla fuentes */}
      <section style={css.fuentesSection}>
        <p style={css.fuentesSubtitle}>
          Todo el proyecto se construye sobre datos de acceso público.
          Ningún dataset requiere licencia comercial ni registro.
        </p>

        <div style={css.fuentesTable}>
          <div style={css.fuentesHeader}>
            <span>Categoría</span><span>Dataset</span>
            <span>Proveedor</span><span>Licencia</span>
          </div>
          {FUENTES.map((f, i) => (
            <div key={i} style={{ ...css.fuentesRow, ...(i % 2 === 1 ? css.fuentesRowAlt : {}) }}>
              <span style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
                <span style={{ ...css.catDot, background: CAT_COLOR[f.cat] ?? '#888' }}/>
                {f.cat}
              </span>
              <span style={css.fuentesNombre}>{f.nombre}</span>
              <span style={css.fuentesProveedor}>{f.proveedor}</span>
              <span style={css.fuentesLic}>{f.cc}</span>
            </div>
          ))}
        </div>

        <div style={css.catLegend}>
          {Object.entries(CAT_COLOR).map(([cat, color]) => (
            <span key={cat} style={css.catLegendItem}>
              <span style={{ ...css.catDot, background: color }}/>{cat}
            </span>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section style={css.ctaSection}>
        <h2 style={css.ctaTitle}>Empieza a navegar el calor de Valencia</h2>
        <button className="anim-glow-btn" style={css.ctaBtn} onClick={onContinuar}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}>
          Abrir el mapa
        </button>
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
      <span style={css.dividerLine}/>
      <span style={css.dividerLabel}>{label}</span>
      <span style={css.dividerLine}/>
    </div>
  );
});

export const ValenciaIcon = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#FF6B1A">
    <path d="M23,14a1,1,0,0,1-1,1H2a1,1,0,0,1,0-2H22A1,1,0,0,1,23,14Zm-3,3.5a1,1,0,0,0-1-1H5a1,1,0,0,0,0,2H19A1,1,0,0,0,20,17.5ZM8,20a1,1,0,0,0,0,2h8a1,1,0,0,0,0-2ZM4,12a1,1,0,0,0,1-1,7,7,0,0,1,14,0,1,1,0,0,0,2,0A9,9,0,0,0,3,11,1,1,0,0,0,4,12Z"/>
    <path d="M10 5.5 L12 9.5 L14 5.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ── Estilos ─────────────────────────────────────────── */

const css = {
  root: {
    position: 'fixed', inset: 0,
    background: '#070709',
    overflowY: 'auto',
    fontFamily: 'inherit',
    color: '#F0F0F0',
    zIndex: 9999,
  },
  topBar: {
    position: 'sticky', top: 0, zIndex: 100,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0.7rem 1.5rem',
    background: 'rgba(7,7,9,0.92)', backdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(255,107,26,0.1)',
  },
  topLogo: {
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    fontSize: '0.72rem', fontWeight: '700', color: '#FF6B1A',
    letterSpacing: '0.12em', textTransform: 'uppercase',
  },
  topCta: {
    padding: '0.35rem 1rem', borderRadius: '100px',
    border: '1px solid rgba(255,107,26,0.4)', background: 'transparent',
    color: '#FF6B1A', fontSize: '0.8rem', fontWeight: '600',
    cursor: 'pointer', fontFamily: 'inherit',
  },
  intro: {
    maxWidth: '720px', margin: '0 auto',
    padding: 'clamp(3rem, 8vw, 6rem) 1.5rem 2.5rem',
    display: 'flex', flexDirection: 'column', gap: '1.1rem',
  },
  introLabel: {
    fontSize: '0.7rem', fontWeight: '600', color: '#FF6B1A',
    letterSpacing: '0.15em', textTransform: 'uppercase',
  },
  introH1: {
    fontSize: 'clamp(2rem, 4.5vw, 3.2rem)', fontWeight: '700',
    lineHeight: 1.1, letterSpacing: '-0.03em', color: '#F0F0F0',
  },
  introDesc: {
    fontSize: '0.97rem', color: '#6B7A8D', lineHeight: 1.7, maxWidth: '560px',
  },
  introPills: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.3rem' },
  pill: {
    padding: '0.3rem 0.8rem', borderRadius: '100px',
    border: '1px solid rgba(255,107,26,0.25)',
    background: 'rgba(255,107,26,0.06)', color: '#FF6B1A',
    fontSize: '0.75rem', fontWeight: '500',
  },
  scrollHint: {
    alignSelf: 'flex-start', background: 'none', border: 'none',
    color: '#3D4756', fontSize: '0.78rem', letterSpacing: '0.05em',
    cursor: 'pointer', fontFamily: 'inherit', padding: 0,
  },
  divider: {
    display: 'flex', alignItems: 'center', gap: '1rem',
    padding: '0 1.5rem', maxWidth: '1080px', margin: '1rem auto 0',
  },
  dividerLine: { flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' },
  dividerLabel: {
    fontSize: '0.68rem', fontWeight: '700', color: '#FF6B1A',
    letterSpacing: '0.18em', textTransform: 'uppercase', whiteSpace: 'nowrap',
  },
  pasosGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1px', maxWidth: '1080px', margin: '2rem auto 0',
    padding: '0 1.5rem',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '16px', overflow: 'hidden',
  },
  pasoCard: {
    background: '#0C0C10', padding: '1.5rem',
    display: 'flex', flexDirection: 'column', gap: '0.5rem',
  },
  pasoTop: {
    display: 'flex', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: '0.5rem',
  },
  pasoStat: {
    fontSize: '0.65rem', fontWeight: '700', color: '#3D4756',
    letterSpacing: '0.06em', textTransform: 'uppercase',
    background: 'rgba(255,255,255,0.04)', borderRadius: '6px',
    padding: '0.2rem 0.5rem', alignSelf: 'flex-start',
  },
  pasoNum: {
    fontSize: '0.62rem', fontWeight: '700', color: '#FF6B1A', letterSpacing: '0.12em',
  },
  pasoTitulo: {
    fontSize: '0.93rem', fontWeight: '600', color: '#E0E0E0', letterSpacing: '-0.01em',
  },
  pasoCuerpo: { fontSize: '0.8rem', color: '#5A6578', lineHeight: 1.65 },
  fuentesSection: {
    maxWidth: '1080px', margin: '2rem auto 0',
    padding: '0 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem',
  },
  fuentesSubtitle: { fontSize: '0.88rem', color: '#5A6578', lineHeight: 1.6, maxWidth: '560px' },
  fuentesTable: {
    border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px',
    overflow: 'hidden', fontSize: '0.78rem',
  },
  fuentesHeader: {
    display: 'grid', gridTemplateColumns: '110px 1fr 1.3fr 80px',
    padding: '0.65rem 1rem',
    background: 'rgba(255,107,26,0.05)', color: '#FF6B1A',
    fontWeight: '600', letterSpacing: '0.06em',
    fontSize: '0.68rem', textTransform: 'uppercase',
  },
  fuentesRow: {
    display: 'grid', gridTemplateColumns: '110px 1fr 1.3fr 80px',
    padding: '0.7rem 1rem', alignItems: 'center',
    borderTop: '1px solid rgba(255,255,255,0.04)',
  },
  fuentesRowAlt: { background: 'rgba(255,255,255,0.015)' },
  fuentesNombre: { color: '#D0D0D0', fontWeight: '500' },
  fuentesProveedor: { color: '#5A6578' },
  fuentesLic: { color: '#3D4756', fontSize: '0.7rem', fontWeight: '500' },
  catDot: {
    display: 'inline-block', width: '7px', height: '7px',
    borderRadius: '50%', flexShrink: 0,
  },
  catLegend: { display: 'flex', flexWrap: 'wrap', gap: '1rem', padding: '0.25rem 0' },
  catLegendItem: { display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: '#5A6578' },
  ctaSection: {
    maxWidth: '720px', margin: '0 auto',
    padding: 'clamp(3rem, 8vw, 5rem) 1.5rem',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '1.2rem', textAlign: 'center',
  },
  ctaTitle: {
    fontSize: 'clamp(1.4rem, 3vw, 2.2rem)', fontWeight: '700',
    letterSpacing: '-0.025em', color: '#F0F0F0', lineHeight: 1.15,
  },
  ctaBtn: {
    padding: '0.9rem 2.8rem', borderRadius: '100px',
    border: '1px solid rgba(255,107,26,0.45)', background: '#FF6B1A',
    color: '#070709', fontSize: '0.95rem', fontWeight: '700',
    cursor: 'pointer', letterSpacing: '0.02em', fontFamily: 'inherit',
    transition: 'transform 0.2s ease',
  },
};
