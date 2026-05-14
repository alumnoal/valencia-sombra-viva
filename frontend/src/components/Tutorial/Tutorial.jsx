import React, { useState } from 'react';

const STEPS = [
  {
    emoji: '🌆',
    title: 'Valencia bajo el sol',
    desc: 'Explora Valencia de forma inteligente. Sombra en tiempo real, calidad del aire y rutas frescas, todo en un mapa interactivo.',
  },
  {
    emoji: '🌡️',
    title: 'Índice de Sombra',
    desc: 'Toca cualquier punto del mapa para ver el índice de sombra y la calidad del aire en ese lugar exacto.',
  },
  {
    emoji: '🗺️',
    title: 'Ruta Fresca',
    desc: 'Activa el modo ruta, marca origen y destino, y calcula el camino más fresco evitando las zonas de calor intenso.',
  },
  {
    emoji: '🏛️',
    title: 'Refugios Climáticos',
    desc: 'Encuentra fuentes, bibliotecas, centros de mayores y farmacias cercanas donde refugiarte cuando el calor aprieta.',
  },
];

export default function Tutorial({ onDone, onSkip }) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;

  const next = () => isLast ? onDone() : setStep(s => s + 1);
  const prev = () => setStep(s => s - 1);

  return (
    <div style={css.overlay}>
      <div style={css.card}>
        <button style={css.skipBtn} onClick={onSkip}>
          Saltar &rarr;
        </button>

        <div key={step} className="anim-step" style={css.stepWrap}>
          <div className="anim-icon" style={css.iconCircle}>
            <span style={css.emoji}>{STEPS[step].emoji}</span>
          </div>
          <h2 style={css.title}>{STEPS[step].title}</h2>
          <p style={css.desc}>{STEPS[step].desc}</p>
        </div>

        <div style={css.dots}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={i === step ? { ...css.dot, ...css.dotActive } : css.dot}
              onClick={() => setStep(i)}
            />
          ))}
        </div>

        <div style={css.btnRow}>
          {step > 0 ? (
            <button style={css.btnSecondary} onClick={prev}>
              ← Anterior
            </button>
          ) : (
            <div />
          )}
          <button
            className={isLast ? 'anim-glow-btn' : ''}
            style={isLast ? { ...css.btnPrimary, ...css.btnStart } : css.btnPrimary}
            onClick={next}
          >
            {isLast ? 'Empezar' : 'Siguiente →'}
          </button>
        </div>
      </div>
    </div>
  );
}

const css = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: '#070709',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '1rem',
  },
  card: {
    position: 'relative',
    width: '100%',
    maxWidth: '420px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,107,26,0.15)',
    borderRadius: '20px',
    padding: '2.5rem 2rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.5rem',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 0 80px rgba(255,107,26,0.06)',
  },
  skipBtn: {
    position: 'absolute',
    top: '1.1rem',
    right: '1.2rem',
    background: 'none',
    border: 'none',
    color: '#3D4756',
    fontSize: '0.78rem',
    cursor: 'pointer',
    fontFamily: 'inherit',
    letterSpacing: '0.04em',
    transition: 'color 0.2s',
    padding: '0.2rem 0.4rem',
  },
  stepWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    minHeight: '200px',
    justifyContent: 'center',
    width: '100%',
  },
  iconCircle: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,107,26,0.18) 0%, rgba(255,107,26,0.04) 70%)',
    border: '1px solid rgba(255,107,26,0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: '2.2rem',
    lineHeight: 1,
  },
  title: {
    fontSize: '1.35rem',
    fontWeight: '700',
    color: '#F0F0F0',
    textAlign: 'center',
    letterSpacing: '-0.02em',
  },
  desc: {
    fontSize: '0.9rem',
    color: '#6B7A8D',
    textAlign: 'center',
    lineHeight: 1.65,
    maxWidth: '320px',
  },
  dots: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
  },
  dot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.12)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  dotActive: {
    width: '22px',
    borderRadius: '4px',
    background: '#FF6B1A',
  },
  btnRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    gap: '0.75rem',
  },
  btnSecondary: {
    padding: '0.65rem 1.25rem',
    borderRadius: '100px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'transparent',
    color: '#5A6578',
    fontSize: '0.85rem',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'color 0.2s, border-color 0.2s',
  },
  btnPrimary: {
    marginLeft: 'auto',
    padding: '0.65rem 1.6rem',
    borderRadius: '100px',
    border: '1px solid rgba(255,107,26,0.4)',
    background: 'transparent',
    color: '#FF6B1A',
    fontSize: '0.88rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.2s, color 0.2s',
  },
  btnStart: {
    background: '#FF6B1A',
    color: '#070709',
    fontWeight: '700',
  },
};
