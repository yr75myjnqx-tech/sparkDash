/**
 * sparkDash honest-visuals display configuration — SINGLE SOURCE OF TRUTH.
 *
 * Every rendering constant for the presentation layer lives here and nowhere
 * else (invariant I-11). Nothing in this file may be overridden per node, per
 * request, or via content.
 *
 * Colour-token mapping (§5.6 of the build instruction):
 *   --risk   → --color-danger  (genuine risk only: thermal warn, storage ≥ 90%,
 *                              exporter errors, offline)
 *   --warn   → --color-warning (approaching risk: temp warn band, storage 80–90%)
 *   --ok     → --color-success (healthy-state confirmations: badges, lanes)
 *   --accent → --color-accent  (neutral data: utilisation, throughput, cache %)
 *   --muted  → --color-muted   (placeholders, labels, NO DATA states)
 *
 * OQ-3 provenance: TEMP_WARN_C / TEMP_THROTTLE_C measured 2026-09-09 on gx10
 * (GB10) via `nvidia-smi -q -d TEMPERATURE`: GPU T.Limit Temp 51 °C,
 * slowdown/shutdown limits N/A, idle reading 45 °C. The instruction's 85/90
 * placeholders sit ABOVE the only thermal limit the silicon reports and were
 * replaced. Validate under sustained load before treating as final.
 *
 * OQ-6 provenance: MODEL_SCALES entries are observed tok/s, not measured
 * ceilings — refine from sustained-load benchmarks per model.
 */

export const DISPLAY = {
  /** Sparkline window (s). Sample count derives from the 2 s poll cadence
   * (upstream POLL_INTERVAL_GPU): a 5-minute window is ~150 samples. */
  SPARKLINE_WINDOW_S: 300,
  /** Fixed sparkline domains — never auto-scale (invariant I-1). */
  TEMP_DOMAIN_C: [20, 95],
  TEMP_WARN_C: 45, // measured GB10 T.Limit headroom; see OQ-3 header note
  TEMP_THROTTLE_C: 51, // nvidia-smi "GPU T.Limit Temp" on GB10 (2026-09-09)
  USAGE_DOMAIN: [0, 100],
  GAUGE_SMOOTH_MS: 300, // EMA time constant, rAF-driven
  IDLE_AFTER_S: 10, // gauge idle-state threshold
  STALE_AFTER_S: 10, // card dim + STALE badge
  DEAD_AFTER_S: 60, // section falls back to NO DATA placeholder
  AGG_WINDOW_S: 900, // TTFT P95 rolling window, labelled "15m"
  STORAGE_WARN: 0.8,
  STORAGE_RISK: 0.9,
  TELEMETRY_STRING_MAX: 200, // cap at API boundary
};

/**
 * Gauge scales are model-specific (Addendum A, invariant I-2′). Key: served
 * model name exactly as the backend probe reports it (vLLM /v1/models id;
 * ds4 model_alias/model_path). Never per node, never auto-scaled.
 * Adding or changing an entry is a code edit with a `source:` string.
 */
export const MODEL_SCALES = {
  "ornith-1.5-35b": {
    gen: 500,
    prefill: 5000,
    source: "observed 2026-09-09",
  },
  "deepseek-v4-flash-vision-exp": {
    gen: 100,
    prefill: 1000,
    source: "observed 2026-09-09",
  },
};

/** Scale for a model key absent from MODEL_SCALES — always badged DEFAULT SCALE. */
export const FALLBACK_SCALE = { gen: 100, prefill: 1000 };

/** Normalise node names to the Operator's convention (§5.4, AT-15).
 * Display layer only — hosts are never renamed. Only the gxN pattern is
 * touched; anything else (e.g. upstream "Spark 1") passes through. */
export function displayNodeName(name) {
  const m = /^gx[-_ ]?(\d+)$/i.exec((name ?? "").trim());
  return m ? `GX${m[1]}` : (name ?? "");
}

// ─── Precision rules (§5.7) — display-layer only, never at the API boundary ──

export function fmtTemp(celsius: number): string {
  return `${Math.round(celsius)}°C`;
}

export function fmtPower(watts: number): string {
  return `${watts.toFixed(1)} W`;
}

/** used / total capacity line, 1 decimal GB (§5.3). */
export function fmtCapacityGb(usedGb: number, totalGb: number): string {
  return `${usedGb.toFixed(1)} / ${totalGb.toFixed(1)} GB`;
}

/** Integer GB for "Available"-style headroom figures. */
export function fmtGbInteger(gb: number): string {
  return `${Math.round(gb)} GB`;
}

export function fmtTok(tps: number): string {
  return `${Math.round(tps)}`;
}

export function fmtPct(frac: number): string {
  return `${Math.round(frac * 100)}%`;
}

/** TTFT / latency aggregates: 1 decimal s (§5.7). */
export function fmtSeconds(seconds: number): string {
  return `${seconds.toFixed(1)}s`;
}
