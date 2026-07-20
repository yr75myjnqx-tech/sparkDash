import type { SparkSnapshot } from "../../api/types";
import { EditIcon } from "../ui/icons";

interface SparkHeaderProps {
  spark: SparkSnapshot;
  onEdit?: () => void;
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return "<1m";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  if (hours < 24) return `${hours}h ${remainMins}m`;
  const days = Math.floor(hours / 24);
  const remainHours = hours % 24;
  return `${days}d ${remainHours}h`;
}

export function SparkHeader({ spark, onEdit }: SparkHeaderProps) {
  const { hardware } = spark;
  const online = spark.online;

  return (
    <div className="spark-header panel flex flex-wrap items-center gap-x-4 gap-y-2 p-5" style={online ? undefined : { opacity: 0.6 }}>
      <div className="flex items-center gap-2.5">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${online ? "bg-success dot-glow-success" : "bg-danger"}`}
          title={online ? "Online" : "Offline"}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-base font-semibold text-text-strong">{spark.name}</h2>
            {online && spark.uptime != null && (
              <span
                className="shrink-0 rounded bg-accent/15 px-1.5 py-0.5 font-tabular text-[10px] font-medium text-accent"
                title={`Uptime: ${formatUptime(spark.uptime)}`}
              >
                {formatUptime(spark.uptime)}
              </span>
            )}
          </div>
          <p className="truncate text-xs text-muted">
            {hardware.device} · {hardware.gpuChip}
          </p>
        </div>
      </div>

      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="ml-auto flex items-center gap-1.5 rounded-md border border-border bg-surface-elevated px-3 py-1.5 text-[11px] text-muted hover:bg-surface-hover hover:text-text transition-colors"
        >
          <EditIcon className="h-3 w-3" />
          Edit
        </button>
      )}
    </div>
  );
}