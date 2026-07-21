import { useState, useEffect, useCallback } from "react";
import type { CpuMetrics, RamMetrics, UnifiedMemoryMetrics } from "../../api/types";
import { Sparkline } from "../ui/Sparkline";
import { Panel } from "../ui/Panel";
import { CpuIcon, MemoryIcon } from "../ui/icons";
import { MetricBar } from "../ui/MetricBar";

interface CpuPanelProps {
  cpu: CpuMetrics | null;
  ram: RamMetrics | null;
  unifiedMemory: UnifiedMemoryMetrics | null;
  sparkId: string;
}

function formatMb(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${Math.round(mb)} MB`;
}

function MetricRow({
  label,
  spark,
  value,
  color = "var(--color-accent)",
}: {
  label: string;
  spark: React.ReactNode;
  value: React.ReactNode;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted">{label}</span>
      <div className="flex items-center gap-2.5">
        <span style={{ color }}>{spark}</span>
        <span className="font-tabular text-[13px] font-semibold text-text">{value}</span>
      </div>
    </div>
  );
}

const NV_ERR_STORAGE_KEY = "nvErrBaseline";

function getNvErrBaseline(sparkId: string): number {
  try {
    const raw = localStorage.getItem(`${NV_ERR_STORAGE_KEY}.${sparkId}`);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

function setNvErrBaseline(sparkId: string, value: number) {
  try {
    localStorage.setItem(`${NV_ERR_STORAGE_KEY}.${sparkId}`, String(value));
  } catch {
    /* localStorage may be unavailable */
  }
}

export function CpuPanel({ cpu, ram, unifiedMemory, sparkId }: CpuPanelProps) {
  const [usageHistory, setUsageHistory] = useState<number[]>([]);
  const [nvErrBaseline, setNvErrBaselineState] = useState<number>(() =>
    getNvErrBaseline(sparkId)
  );
  const [nvErrSinceReset, setNvErrSinceReset] = useState<number>(0);

  const nvErrTotal = unifiedMemory?.nvErrNoMemory ?? 0;
  useEffect(() => {
    setNvErrSinceReset(Math.max(0, nvErrTotal - nvErrBaseline));
  }, [nvErrTotal, nvErrBaseline]);

  const handleResetNvErr = useCallback(() => {
    setNvErrBaseline(sparkId, nvErrTotal);
    setNvErrBaselineState(nvErrTotal);
    setNvErrSinceReset(0);
  }, [sparkId, nvErrTotal]);

  const usage = cpu?.usage ?? 0;
  const draw = cpu?.draw ?? 0;
  const tdp = cpu?.tdp ?? 0;

  useEffect(() => {
    setUsageHistory((prev) => [...prev.slice(-30), usage]);
  }, [usage]);

  const ramUsed = ram?.used ?? 0;
  const ramTotal = ram?.total ?? 0;
  const ramPct = ram?.percentage ?? 0;
  const ramAvail = ramTotal > 0 ? ramTotal - ramUsed : 0;

  return (
    <Panel title="CPU" icon={<CpuIcon />} className="panel-cpu" bodyClassName="space-y-3" accent>
      <MetricRow
        label="Usage"
        color="var(--color-accent)"
        spark={<Sparkline data={usageHistory} color="var(--color-accent)" />}
        value={<span className="text-text-strong">{usage}%</span>}
      />
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">Power</span>
        <span className="font-tabular text-[13px] text-text">
          {draw}W / {tdp}W
        </span>
      </div>

      {(ramTotal > 0 || ram) && (
        <div className="space-y-2 border-t border-border pt-3">
          <div className="panel-title mb-2.5">
            <MemoryIcon />
            RAM
          </div>
          <MetricBar
            label="Used"
            value={ramUsed}
            max={ramTotal}
            caption={ramTotal > 0 ? `${formatMb(ramUsed)} / ${formatMb(ramTotal)} · ${ramPct}%` : "—"}
          />
          {ramAvail > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-muted">Available</span>
              <span className="font-tabular text-text">{formatMb(ramAvail)}</span>
            </div>
          )}
          {unifiedMemory?.oomRisk && unifiedMemory.oomRisk !== "low" && (
            <div className="flex justify-between text-xs">
              <span className="text-muted">OOM Risk</span>
              <span
                className={`font-tabular ${
                  unifiedMemory.oomRisk === "high" ? "text-danger" : "text-warning"
                }`}
              >
                {unifiedMemory.oomRisk}
              </span>
            </div>
          )}
          {unifiedMemory !== null && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">NV_ERR_NO_MEMORY</span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`font-tabular ${
                    nvErrSinceReset > 0 ? "text-danger" : "text-text"
                  }`}
                >
                  {nvErrSinceReset > 0 ? `${nvErrSinceReset}` : "0"}
                </span>
                <button
                  type="button"
                  className="cursor-pointer text-[11px] text-muted hover:text-text transition-colors"
                  onClick={handleResetNvErr}
                  title="Reset error counter"
                >
                  ↺
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}