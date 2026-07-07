import React from 'react';
import logo from '../../assets/LOGO.png';

/**
 * VitalinkLoader — animación de carga oficial del sistema.
 * Muestra el logo de la empresa con un "pulso" tipo ECG animado debajo.
 *
 * Props:
 * - caption: texto bajo el pulso (por defecto "Cargando…"). Pasa null para ocultarlo.
 * - size: 'sm' | 'md' | 'lg' (ancho del logo).
 * - logoWidth: ancho del logo en px (sobreescribe size).
 */

const KEYFRAMES_ID = 'vitalink-loader-keyframes';

// Inyecta los keyframes una sola vez (módulo autocontenido, sin depender de index.css).
const ensureKeyframes = () => {
  if (typeof document === 'undefined') return;
  if (document.getElementById(KEYFRAMES_ID)) return;
  const style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent = `
@keyframes vl-ecg-dash { 0% { stroke-dashoffset: 600; } 100% { stroke-dashoffset: 0; } }
@keyframes vl-ecg-dot {
  0% { offset-distance: 0%; opacity: 0; }
  8% { opacity: 1; }
  92% { opacity: 1; }
  100% { offset-distance: 100%; opacity: 0; }
}
@keyframes vl-logo-pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.045); opacity: 0.88; } }
`;
  document.head.appendChild(style);
};

const SIZES = { sm: 96, md: 132, lg: 176 };
const ECG_PATH = 'M0 28 H60 L70 28 L78 12 L88 44 L96 20 L104 28 L130 28 L140 14 L150 42 L158 28 H240';

export default function VitalinkLoader({ caption = 'Cargando…', size = 'md', logoWidth }) {
  ensureKeyframes();
  const w = logoWidth || SIZES[size] || SIZES.md;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        userSelect: 'none',
      }}
    >
      <img
        src={logo}
        alt="VITALINK"
        style={{ width: w, height: 'auto', animation: 'vl-logo-pulse 2s ease-in-out infinite' }}
      />

      <svg width="240" height="56" viewBox="0 0 240 56" style={{ maxWidth: '80%', display: 'block' }}>
        <defs>
          <linearGradient id="vl-ecg-grad" x1="0" x2="1">
            <stop offset="0%" stopColor="#2BC4CC" stopOpacity="0" />
            <stop offset="50%" stopColor="#2BC4CC" stopOpacity="1" />
            <stop offset="100%" stopColor="#1B8A95" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={ECG_PATH}
          fill="none"
          stroke="url(#vl-ecg-grad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ strokeDasharray: 600, animation: 'vl-ecg-dash 2s linear infinite' }}
        />
        <circle
          r="4"
          fill="#E85A5A"
          style={{
            offsetPath: `path('${ECG_PATH}')`,
            animation: 'vl-ecg-dot 2s linear infinite',
            filter: 'drop-shadow(0 0 6px rgba(232,90,90,0.6))',
          }}
        />
      </svg>

      {caption ? (
        <div
          style={{
            font: '500 12px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            color: '#5A7480',
          }}
        >
          {caption}
        </div>
      ) : null}
    </div>
  );
}
