import { ImageResponse } from "next/og";

const BG = "#09090b";
const ACCENT = "#c084fc";
const FAB = "#f97316";

// Arco de 270° (hueco a la derecha) en un viewBox de 100×100.
const R = 38;
const STROKE = 16;
const CIRC = 2 * Math.PI * R;

/**
 * Icono de la app: una "C" con una moneda naranja en el hueco.
 * La versión maskable reduce el dibujo para que quede dentro de la zona segura (círculo del 80 %).
 */
export function appIcon(size: number, { maskable = false } = {}) {
  const art = Math.round(size * (maskable ? 0.5 : 0.62));

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: BG }}>
        <svg width={art} height={art} viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke={ACCENT}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${CIRC * 0.7} ${CIRC}`}
            strokeDashoffset={-CIRC * 0.15}
          />
          <circle cx={50 + R} cy="50" r="11" fill={FAB} />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
