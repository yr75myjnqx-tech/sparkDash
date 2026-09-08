/**
 * Semicircular speedometer dial for tok/s metrics, styled after a classic
 * performance gauge: alternating outer segments with scale numbers, a neutral
 * arc, a needle, and a big digital readout below the pivot. Inline SVG — no
 * chart library.
 *
 * Honest-visuals semantics (§5.2, Addendum A/C):
 * - `max` is REQUIRED and always comes from MODEL_SCALES[modelId] (or the
 *   badged FALLBACK_SCALE). There is no adaptive scale — a dial that
 *   rescales with traffic was defect class T4 and is gone.
 * - No coloured zones: a universal "good throughput" range does not exist
 *   across models, so the arc is neutral.
 * - Idle is explicit: 0 tok/s for ≥ IDLE_AFTER_S dims the dial to 40% and
 *   overlays "idle" — an idle gauge must never read as healthy throughput.
 * - The needle is EMA-smoothed (τ = GAUGE_SMOOTH_MS) and driven by
 *   requestAnimationFrame; raw value updates only change the target.
 * - At/past max the pointer pins and takes the WARN colour (a stale
 *   MODEL_SCALES entry, not a risk state) and a note is logged.
 * - The SVG is aria-hidden; the numeric readout is the semantic source (I-6).
 */
import { useEffect, useRef, useState } from "react";
import { DISPLAY } from "../../config/display.js";

const CX = 60;
const CY = 64;
const R_OUTER = 52; // outer segment band
const R_INNER = 34; // neutral arc inner radius

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

/** Annular sector between fractions `from`..`to` (used for segments and arc). */
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
  /** Fixed scale maximum (tok/s) — REQUIRED (MODEL_SCALES, I-2′). */
  max: number;
  /** True when `max` is FALLBACK_SCALE — renders the DEFAULT SCALE badge. */
  fallbackScale?: boolean;
}

const SEGMENTS = 10;
/** EMA smoothing constant: fraction of remaining distance closed per ms. */
const EMA_PER_MS = 1 / DISPLAY.GAUGE_SMOOTH_MS;

export function SpeedGauge({ label, value, max, fallbackScale = false }: SpeedGaugeProps) {
  const scale = max > 0 ? max : 1;
  const targetFrac = Math.max(0, Math.min(1, value / scale));
  const over = value >= scale && value > 0;

  const needleRef = useRef<SVGGElement | null>(null);
  const displayedFrac = useRef(targetFrac);
  const lastNonZeroAt = useRef(value > 0 ? Date.now() : 0);
  const wasOver = useRef(false);
  const [idle, setIdle] = useState(false);

  // rAF needle: EMA toward the raw target at the telemetry rate; React state
  // only changes on idle transitions (AT-14 — no high-frequency setState).
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(100, now - last);
      last = now;
      if (value > 0) lastNonZeroAt.current = now;
      const alpha = 1 - Math.exp(-dt * EMA_PER_MS);
      displayedFrac.current += (targetFrac - displayedFrac.current) * alpha;
      if (needleRef.current) {
        needleRef.current.style.transform = `rotate(${180 * (displayedFrac.current - 1)}deg)`;
      }
      setIdle(now - lastNonZeroAt.current >= DISPLAY.IDLE_AFTER_S * 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, targetFrac]);

  // Over-scale is evidence the MODEL_SCALES entry is stale — warn once per
  // excursion (feeds OQ-6's measurement pass), never a risk colour.
  useEffect(() => {
    if (over && !wasOver.current) {
      console.info(
        `[SpeedGauge] "${label}" ${Math.round(value)} tok/s at/past scale max ${scale} — ` +
          "MODEL_SCALES entry may need refinement (see OQ-6)."
      );
    }
    wasOver.current = over;
  }, [over, label, value, scale]);

  const segs = Array.from({ length: SEGMENTS }, (_, i) => i);
  const needleStroke = over ? "var(--color-warning)" : "var(--color-text-strong)";

  return (
    <div
      className={`relative flex flex-col items-center gap-0.5 transition-opacity duration-500 ${
        idle ? "opacity-40" : ""
      }`}
    >
      <span className="text-[11px] font-bold uppercase tracking-wide text-text">{label}</span>
      <svg
        width={200}
        height={146}
        viewBox="-4 0 140 96"
        className="block max-w-full"
        aria-hidden="true"
      >
        {/* outer scale segments, alternating neutral shading */}
        {segs.map((i) => (
          <path
            key={i}
            d={annularSector(i / SEGMENTS + 0.012, (i + 1) / SEGMENTS - 0.012, R_OUTER, R_OUTER - 9)}
            fill={i % 2 === 0 ? "var(--color-border)" : "var(--color-surface-hover)"}
            opacity={i % 2 === 0 ? 0.7 : 1}
          />
        ))}
        {/* major tick marks at the labelled fractions — give the dial visible
            structure in both themes (labels alone were illegible at 7px muted). */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const t1 = polar(frac, R_OUTER + 0.5);
          const t2 = polar(frac, R_OUTER + 3.5);
          return (
            <line
              key={`tick-${frac}`}
              x1={t1.x}
              y1={t1.y}
              x2={t2.x}
              y2={t2.y}
              stroke="var(--color-text-strong)"
              strokeWidth={frac === 0 || frac === 1 ? 1.4 : 1}
              opacity={0.75}
            />
          );
        })}
        {/* scale numbers (0 → max); the max is always printed so the scale's
            context is visible next to the needle (Addendum A). Same five
            positions on every dial, one formatter — comparable across cards. */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const p = polar(frac, R_OUTER + 9);
          return (
            <text
              key={`label-${frac}`}
              x={p.x}
              y={p.y + 2.8}
              textAnchor="middle"
              fontSize={8}
              fontWeight={600}
              fill="var(--color-text)"
            >
              {fmt(frac * scale)}
            </text>
          );
        })}
        {/* neutral arc — no coloured zones (§5.2 item 2). */}
        <path
          d={annularSector(0.004, 1 - 0.004, R_OUTER - 11, R_INNER)}
          fill="var(--color-border)"
          opacity={0.5}
        />
        {/* needle: EMA-smoothed via rAF; theme-aware, WARN colour only when
            pinned over a stale scale entry. */}
        <g
          ref={needleRef}
          style={{
            transform: `rotate(${180 * (displayedFrac.current - 1)}deg)`,
            transformOrigin: `${CX}px ${CY}px`,
          }}
        >
          <line
            x1={CX - 5}
            y1={CY}
            x2={CX + R_INNER - 4}
            y2={CY}
            stroke={needleStroke}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        </g>
        <circle cx={CX} cy={CY} r={3} fill={needleStroke} />
        {/* digital readout below the pivot — the semantic source (I-6). */}
        <text
          x={CX}
          y={CY + 26}
          textAnchor="middle"
          fontSize={14}
          fontWeight={700}
          fill="var(--color-text-strong)"
          className="font-tabular"
        >
          {Math.round(value)}
          <tspan fontSize={7} fontWeight={400} fill="var(--color-muted)">
            {" "}
            tok/s
          </tspan>
        </text>
      </svg>
      {idle && (
        <span className="absolute inset-0 flex items-center justify-center pt-4 text-[11px] font-semibold uppercase tracking-wide text-muted">
          idle
        </span>
      )}
      {fallbackScale && (
        <span
          className="rounded bg-warning/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-warning"
          title="This model is not in MODEL_SCALES — rendering at the fallback scale. Add a measured entry in src/config/display.js."
        >
          Default Scale
        </span>
      )}
    </div>
  );
}
