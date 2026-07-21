# sparkDash Fork — `dev/fork`

This fork builds on **sparkDash v1.1.7** and adds the following features not present in the upstream release.

## Fork Features

### 1. IB/RDMA Counter Monitoring

Adds InfiniBand/RDMA port counter monitoring to the Network panel. Both local and remote (SSH) collection:

- Discovers IB devices via `/sys/class/infiniband/*/device/net`
- Reads `port_rcv_data` / `port_xmit_data` counters (4-byte dword units)
- Computes RX/TX speeds from counter deltas, displayed alongside Ethernet interfaces
- Local collection via sysfs, remote via SSH
- Inactive IB links (counter stuck at 0) are filtered from the panel

**Files:** `server/collectors/SystemCollector.js`, `src/components/SparkPage/NetworkPanel.tsx`, `src/api/types.ts`

### 2. Improved OOM Risk Heuristic

Refines the unified-memory OOM risk calculation:

- Uses `MemAvailable` (real free memory) as the primary signal
- Thresholds: `high` when available < 1 GB or percentage > 95%; `medium` when available < 4 GB or percentage > 80%
- More conservative than upstream to catch early memory pressure on unified-memory systems (DGX Spark)

**Files:** `server/collectors/SystemCollector.js`

### 3. LLM Uptime, Queue Time, Inter-Token Latency

Additional LLM metrics surfaced:

- **Uptime:** Process uptime parsed from the `process_start_time_seconds` / `vllm:process_start_time_seconds` Prometheus-style metric
- **Inter-token latency (ITL):** Average time between generated tokens, computed from iteration counters and generation tokens served
- **Queue time:** Average request queue wait time, derived from `vllm:request_queue_time_seconds_sum / _count` histogram
- **vLLM cache config info:** Reads `/metrics` endpoint for `cache_config_info` gauge (KV cache dtype, block size, etc.)
- **Host command-line fallback:** On remote hosts, uses cached/config-defined commands as fallback when LLM /metrics endpoint is unreachable

**Files:** `server/collectors/SystemCollector.js`, `server/collectors/llm/`, `src/api/types.ts`, `src/components/SparkPage/LlmPanel.tsx`

### 4. Redundant IB/RDMA Lines Filtered

IB/RDMA interfaces whose counters remain at 0 (inactive links) are excluded from the Network panel display to reduce noise.

**Files:** `src/components/SparkPage/NetworkPanel.tsx`

### 5. NV_ERR_NO_MEMORY Kernel Error Counter

Monitors NVIDIA kernel driver out-of-memory errors:

- Counts `NV_ERR_NO_MEMORY` occurrences from kernel logs (`journalctl -k` local, with `dmesg` fallback; `dmesg` over SSH)
- Displayed in the CPU/RAM panel with a numeric count
- **Reset button** (↺) next to the count sets a baseline in `localStorage`; shows only errors *since last reset*
- Count turns red when new errors are detected

**Files:** `server/collectors/SystemCollector.js`, `src/api/types.ts`, `src/components/SparkPage/CpuPanel.tsx`

## Version

Based on v1.1.7 (commit `0786403`). Run `npm run build` to rebuild.
