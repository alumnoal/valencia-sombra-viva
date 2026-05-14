import React from "react";

const NIVEL = {
  bueno:     { dot: "#4ade80", text: "#4ade80",  border: "rgba(74,222,128,0.25)"  },
  razonable: { dot: "#FF6B1A", text: "#FF6B1A",  border: "rgba(255,107,26,0.25)"  },
  malo:      { dot: "#f87171", text: "#f87171",  border: "rgba(248,113,113,0.25)" },
};

export default function AlertaCalor({ nivel, estacionesAlerta }) {
  if (!nivel) return null;
  const c = NIVEL[nivel] || NIVEL.bueno;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "0.5rem",
      padding: "0.28rem 0.8rem", borderRadius: "100px",
      background: "rgba(255,255,255,0.04)",
      border: `1px solid ${c.border}`,
    }}>
      <div style={{
        width: "6px", height: "6px", borderRadius: "50%",
        background: c.dot,
        boxShadow: `0 0 8px ${c.dot}`,
        flexShrink: 0,
      }} />
      <span style={{ fontSize: "0.78rem", color: "#5A6578", whiteSpace: "nowrap" }}>
        Aire:&nbsp;<strong style={{ color: c.text }}>{nivel}</strong>
        {estacionesAlerta > 0 && <span style={{ color: "#3D4756" }}> · {estacionesAlerta} alertas</span>}
      </span>
    </div>
  );
}
