import type { LlmMetrics } from "../../api/types";

/**
 * Compact "serving lanes" widget for vLLM backends: one lane box per
 * concurrent request slot (--max-num-seqs), a status badge
 * (HEALTHY / FULL / SATURATED), queue depth, and a bottom stat row
 * (TTFT p95 / KV cache / generation tok/s).
 *
 * Deviations from the vLLM-serving-queue-dashboard spec: sparkDash is not a
 * request gateway, so live per-request durations and per-request queue waits
 * are not available (vLLM only exposes aggregate counts). Those rows are
 * omitted; everything else maps onto existing LlmMetrics probe fields.
 */

interface ServingLanesProps {
  llm: LlmMetrics;
  /** Configured vLLM --max-num-seqs, or null when unknown (auto-size). */
  maxNumSeqs: number | null;
}

type ServingStatus = "healthy" | "full" | "saturated";

const STATUS_STYLES: Record<
  ServingStatus,
  { label: string; badge: string; dot: string }
> = {
  healthy: {
    label: "HEALTHY",
    badge: "bg-success/15 text-success",
    dot: "bg-success dot-glow-success",
  },
  full: {
    label: "FULL",
    badge: "bg-warning/15 text-warning",
    dot: "bg-warning",
  },
  saturated: {
    label: "SATURATED",
    badge: "bg-danger/15 text-danger",
    dot: "bg-danger",
  },
};

/** Cap rendered lane boxes so very large max-num-seqs stays readable. */
const MAX_RENDERED_LANES = 48;

export function ServingLanes({ llm, maxNumSeqs }: ServingLanesProps) {
  const running = llm.requestsRunning ?? 0;
  const waiting = llm.requestsWaiting ?? 0;
  const hasData = llm.requestsRunning != null || llm.requestsWaiting != null;

  // Without a configured capacity there is no "full" state — degrade to
  // HEALTHY vs SATURATED (queue backing up).
  const total = maxNumSeqs ?? Math.max(running + waiting, 1);
  const occupied = Math.min(Math.round(running), total);
  const status: ServingStatus =
    maxNumSeqs != null
      ? occupied >= total && waiting > 0
        ? "saturated"
        : occupied >= total
          ? "full"
          : "healthy"
      : waiting > 0
        ? "saturated"
        : "healthy";
  const styles = STATUS_STYLES[status];

  const rendered = Math.min(total, MAX_RENDERED_LANES);
  const hiddenLanes = total - rendered;

  const ttft =
    llm.ttftP95Seconds != null
      ? llm.ttftP95Seconds < 1
        ? `${Math.round(llm.ttftP95Seconds * 1000)}ms`
        : `${llm.ttftP95Seconds.toFixed(1)}s`
      : "—";
  const kv =
    llm.kvCacheUsage != null ? `${(llm.kvCacheUsage * 100).toFixed(0)}%` : "—";
  const kvTone =
    llm.kvCacheUsage == null
      ? "text-text"
      : llm.kvCacheUsage >= 0.8
        ? "text-danger"
        : llm.kvCacheUsage >= 0.5
          ? "text-warning"
          : "text-success";
  const prefix =
    llm.prefixCacheHitRate != null
      ? `${(llm.prefixCacheHitRate * 100).toFixed(0)}%`
      : "—";

  return (
    <div className="space-y-2 border-t border-border pt-3">
      {/* Header: title + status badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${styles.dot}`} />
          <span className="text-[10px] uppercase tracking-wide text-muted">
            Serving Lanes
          </span>
        </div>
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${styles.badge}`}
        >
          {styles.label}
        </span>
      </div>

      {/* Lane boxes */}
      {hasData ? (
        <div className="flex flex-wrap items-center gap-1">
          {Array.from({ length: rendered }, (_, i) => (
            <span
              key={i}
              className={`h-3.5 w-3.5 rounded-[4px] ${
                i < occupied ? "bg-success" : "bg-border/60"
              }`}
            />
          ))}
          {hiddenLanes > 0 && (
            <span className="text-[10px] text-muted">+{hiddenLanes}</span>
          )}
          <span className="ml-auto font-tabular text-[11px] text-muted">
            {occupied}/{total}
            {maxNumSeqs == null && (
              <span className="ml-1 text-[10px]">auto</span>
            )}
          </span>
        </div>
      ) : (
        <div className="text-xs text-muted">—</div>
      )}

      {/* Queue */}
      <div className="flex items-center justify-between rounded-md border border-warning/20 bg-warning/5 px-2 py-1.5">
        <span className="text-[10px] uppercase tracking-wide text-muted">
          Queue
        </span>
        <span
          className={`font-tabular text-xs ${
            waiting > 0 ? "text-warning" : "text-text"
          }`}
        >
          {hasData ? `${Math.round(waiting)} waiting` : "—"}
        </span>
      </div>

      {/* Bottom stat row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-0.5">
          <div className="text-[10px] uppercase tracking-wide text-muted">
            TTFT p95
          </div>
          <div className="font-tabular text-xs text-text">{ttft}</div>
        </div>
        <div className="space-y-0.5">
          <div className="text-[10px] uppercase tracking-wide text-muted">
            KV Cache
          </div>
          <div className={`font-tabular text-xs ${kvTone}`}>{kv}</div>
        </div>
        <div className="space-y-0.5">
          <div className="text-[10px] uppercase tracking-wide text-muted">
            Prefix Cache
          </div>
          <div className="font-tabular text-xs text-text">{prefix}</div>
        </div>
      </div>
    </div>
  );
}
