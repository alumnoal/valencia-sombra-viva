import React, { Suspense, lazy } from 'react';

const Spline = lazy(() => import('@splinetool/react-spline'));

const ValenciaIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#FF6B1A">
    <path d="M23,14a1,1,0,0,1-1,1H2a1,1,0,0,1,0-2H22A1,1,0,0,1,23,14Zm-3,3.5a1,1,0,0,0-1-1H5a1,1,0,0,0,0,2H19A1,1,0,0,0,20,17.5ZM8,20a1,1,0,0,0,0,2h8a1,1,0,0,0,0-2ZM4,12a1,1,0,0,0,1-1,7,7,0,0,1,14,0,1,1,0,0,0,2,0A9,9,0,0,0,3,11,1,1,0,0,0,4,12Z"/>
    <path d="M10 5.5 L12 9.5 L14 5.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function LandingPage({ onEnter }) {
  return (
    <div style={css.root}>
      <div style={css.splineWrap}>
        <Suspense fallback={null}>
          <Spline scene="https://prod.spline.design/VGvobkONyeJ0BhwE/scene.splinecode" />
        </Suspense>
      </div>

      <div style={css.gradientTop} />
      <div style={css.gradientBottom} />

      <div className="anim-fade-up" style={css.content}>
        <div style={css.logoRow}>
          <ValenciaIcon size={20} />
          <span style={css.logoLabel}>Valencia Sombra Viva</span>
        </div>

        <h1 style={css.title}>
          Navega el calor<br />de Valencia
        </h1>

        <p style={css.subtitle}>
          Rutas frescas&nbsp;&nbsp;·&nbsp;&nbsp;Sombra en tiempo real&nbsp;&nbsp;·&nbsp;&nbsp;Refugios climáticos
        </p>

        <button
          className="anim-glow-btn"
          style={css.btn}
          onClick={onEnter}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          Explorar la ciudad
        </button>

      </div>
    </div>
  );
}

const css = {
  root: {
    position: 'relative',
    width: '100%',
    height: '100vh',
    background: '#070709',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  splineWrap: {
    position: 'absolute',
    inset: 0,
    zIndex: 0,
  },
  gradientTop: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '18%',
    background: 'linear-gradient(to bottom, #070709 10%, transparent)',
    zIndex: 1,
    pointerEvents: 'none',
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '62%',
    background: 'linear-gradient(to top, #070709 52%, transparent)',
    zIndex: 1,
    pointerEvents: 'none',
  },
  content: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    padding: '0 2rem 4.5rem',
    textAlign: 'center',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.45rem',
    marginBottom: '0.1rem',
  },
  logoLabel: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#FF6B1A',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 'clamp(2.4rem, 5.5vw, 3.8rem)',
    fontWeight: '700',
    color: '#F0F0F0',
    lineHeight: 1.08,
    letterSpacing: '-0.025em',
  },
  subtitle: {
    fontSize: '0.87rem',
    color: '#5A6578',
    letterSpacing: '0.04em',
    marginTop: '-0.2rem',
  },
  btn: {
    marginTop: '0.6rem',
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
  hint: {
    fontSize: '0.72rem',
    color: '#30363F',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginTop: '-0.25rem',
  },
};
