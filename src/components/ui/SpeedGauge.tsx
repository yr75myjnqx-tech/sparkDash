/**
 * Semicircular speedometer dial for tok/s metrics. Inline SVG — no chart
 * library, same idiom as LlmDailyChart. The scale adapts to the live value
 * (nice 1/2/5×10ⁿ ceiling at least `floor` and 25% headroom) so the needle
 * stays meaningful on any hardware; the value arc bands like MetricBar:
 * accent → warning → danger past 60%/85% of scale.
 */

const CX = 60;
const CY = 62;
const R = 48;

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

function arcPath(fracFrom: number, fracTo: number, r: number): string {
  const a = polar(fracFrom, r);
  const b = polar(fracTo, r);
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${r} ${r} 0 0 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

interface SpeedGaugeProps {
  label: string;
  /** Current rate in tok/s. */
  value: number;
  /** Minimum scale maximum — keeps the dial readable when idle. */
  floor?: number;
}

export function SpeedGauge({ label, value, floor = 100 }: SpeedGaugeProps) {
  const max = scaleMax(value, floor);
  const pct = Math.max(0, Math.min(1, value / max));
  const band =
    pct > 0.85
      ? "var(--color-danger)"
      : pct > 0.6
        ? "var(--color-warning)"
        : "var(--color-accent)";
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] uppercase tracking-wide text-muted">{label}</span>
      <svg
        width={120}
        height={72}
        viewBox="0 0 120 72"
        className="block max-w-full"
        role="img"
        aria-label={`${label} ${fmt(value)} tok/s`}
      >
        {/* track */}
        <path
          d={arcPath(0, 1, R)}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={8}
          strokeLinecap="round"
        />
        {/* value arc */}
        {pct > 0 && (
          <path
            d={arcPath(0, pct, R)}
            fill="none"
            stroke={band}
            strokeWidth={8}
            strokeLinecap="round"
          />
        )}
        {/* ticks */}
        {ticks.map((t) => {
          const outer = polar(t, R - 7);
          const inner = polar(t, R - 11);
          return (
            <line
              key={t}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke="var(--color-border)"
              strokeWidth={1.5}
            />
          );
        })}
        {/* scale labels */}
        <text x={CX - R} y={CY + 10} textAnchor="middle" fontSize={7} fill="var(--color-muted)">
          0
        </text>
        <text x={CX + R} y={CY + 10} textAnchor="middle" fontSize={7} fill="var(--color-muted)">
          {fmt(max)}
        </text>
        {/* needle (drawn pointing right, rotated to the value) */}
        <g
          style={{
            transform: `rotate(${180 * (pct - 1)}deg)`,
            transformOrigin: `${CX}px ${CY}px`,
            transition: "transform 600ms cubic-bezier(0.3, 0, 0.2, 1)",
          }}
        >
          <line
            x1={CX}
            y1={CY}
            x2={CX + R - 14}
            y2={CY}
            stroke="var(--color-text-strong)"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </g>
        <circle cx={CX} cy={CY} r={2.5} fill="var(--color-text-strong)" />
        {/* digital readout */}
        <text
          x={CX}
          y={CY - 12}
          textAnchor="middle"
          fontSize={13}
          fontWeight={700}
          fill="var(--color-text-strong)"
          className="font-tabular"
        >
          {fmt(value)}
        </text>
        <text x={CX} y={CY - 4} textAnchor="middle" fontSize={6.5} fill="var(--color-muted)">
          tok/s
        </text>
      </svg>
    </div>
  );
}
