/**
 * Semicircular speedometer dial for tok/s metrics, styled after a classic
 * performance gauge: alternating outer segments with scale numbers, an inner
 * colored zone band (poor → average → good → excellent), a needle, and a big
 * digital readout below the pivot. Inline SVG — no chart library, same idiom
 * as LlmDailyChart.
 *
 * The scale adapts to the live value (nice 1/2/5×10ⁿ ceiling at least `floor`
 * and 25% headroom) so the dial stays meaningful on any hardware; the zones
 * are fractions of the current scale.
 */

const CX = 60;
const CY = 64;
const R_OUTER = 52; // outer segment band
const R_INNER = 34; // zone band inner radius

/** Zone band fractions: poor → average → good → excellent. */
const ZONES: { from: number; to: number; color: string }[] = [
  { from: 0, to: 0.25, color: "var(--color-danger)" },
  { from: 0.25, to: 0.5, color: "var(--color-warning)" },
  { from: 0.5, to: 0.75, color: "var(--color-accent)" },
  { from: 0.75, to: 1, color: "var(--color-success)" },
];

/** Round up to a "nice" 1/2/5×10ⁿ scale with headroom above the value. */
function scaleMax(value: number, floor: number): number {
  const target = Math.max(floor, value * 1.25, 1);
  const exp = Math.floor(Math.log10(target));
  const base = 10 ** exp;
  const mantissa = target / base;
  const nice = mantissa <= 1 ? 1 : mantissa <= 2 ? 2 : mantissa <= 5 ? 5 : 10;
  return nice * base;
}

function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return n >= 100 ? n.toFixed(0) : n.toFixed(1).replace(/\.0$/, "");
}

/** Point on the dial at fraction `frac` (0 = far left, 1 = far right). */
function polar(frac: number, r: number): { x: number; y: number } {
  const rad = ((180 - frac * 180) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY - r * Math.sin(rad) };
}

function pt(p: { x: number; y: number }): string {
  return `${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
}

/** Annular sector between fractions `from`..`to` (used for segments and zones). */
function annularSector(from: number, to: number, rOuter: number, rInner: number): string {
  const o1 = polar(from, rOuter);
  const o2 = polar(to, rOuter);
  const i2 = polar(to, rInner);
  const i1 = polar(from, rInner);
  return [
    `M ${pt(o1)}`,
    `A ${rOuter} ${rOuter} 0 0 1 ${pt(o2)}`,
    `L ${pt(i2)}`,
    `A ${rInner} ${rInner} 0 0 0 ${pt(i1)}`,
    "Z",
  ].join(" ");
}

interface SpeedGaugeProps {
  label: string;
  /** Current rate in tok/s. */
  value: number;
  /** Minimum scale maximum — keeps the dial readable when idle. */
  floor?: number;
}

const SEGMENTS = 10;

export function SpeedGauge({ label, value, floor = 100 }: SpeedGaugeProps) {
  const max = scaleMax(value, floor);
  const pct = Math.max(0, Math.min(1, value / max));
  const segs = Array.from({ length: SEGMENTS }, (_, i) => i);

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] uppercase tracking-wide text-muted">{label}</span>
      <svg
        width={200}
        height={146}
        viewBox="0 0 132 96"
        className="block max-w-full"
        role="img"
        aria-label={`${label} ${fmt(value)} tok/s`}
      >
        {/* outer scale segments, alternating shading */}
        {segs.map((i) => (
          <path
            key={i}
            d={annularSector(i / SEGMENTS + 0.012, (i + 1) / SEGMENTS - 0.012, R_OUTER, R_OUTER - 9)}
            fill={i % 2 === 0 ? "var(--color-border)" : "var(--color-surface-hover)"}
            opacity={i % 2 === 0 ? 0.55 : 1}
          />
        ))}
        {/* scale numbers at the zone boundaries (0 → max) */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const p = polar(frac, R_OUTER + 8);
          return (
            <text
              key={frac}
              x={p.x}
              y={p.y + 2.5}
              textAnchor="middle"
              fontSize={7}
              fill="var(--color-muted)"
            >
              {fmt(frac * max)}
            </text>
          );
        })}
        {/* zone band: poor → average → good → excellent */}
        {ZONES.map((z) => (
          <path
            key={z.from}
            d={annularSector(z.from + 0.004, z.to - 0.004, R_OUTER - 11, R_INNER)}
            fill={z.color}
            opacity={0.85}
          />
        ))}
        {/* needle (drawn pointing right, rotated to the value) */}
        <g
          style={{
            transform: `rotate(${180 * (pct - 1)}deg)`,
            transformOrigin: `${CX}px ${CY}px`,
            transition: "transform 600ms cubic-bezier(0.3, 0, 0.2, 1)",
          }}
        >
          <line
            x1={CX - 5}
            y1={CY}
            x2={CX + R_INNER - 4}
            y2={CY}
            stroke="var(--color-success)"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        </g>
        <circle cx={CX} cy={CY} r={3} fill="var(--color-success)" />
        {/* digital readout below the pivot */}
        <text
          x={CX}
          y={CY + 26}
          textAnchor="middle"
          fontSize={17}
          fontWeight={700}
          fill="var(--color-text-strong)"
          className="font-tabular"
        >
          {fmt(value)}
          <tspan fontSize={7} fontWeight={400} fill="var(--color-muted)">
            {" "}
            tok/s
          </tspan>
        </text>
      </svg>
    </div>
  );
}
