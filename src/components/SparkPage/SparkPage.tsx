import { useState, useEffect, useCallback } from "react";
import type { SparkSnapshot } from "../../api/types";
import { updateSpark, refreshSparkMetric } from "../../api/client";
import { SparkHeader } from "./SparkHeader";
import { GpuPanel } from "./GpuPanel";
import { CpuPanel } from "./CpuPanel";
import { StoragePanel } from "./StoragePanel";
import { NetworkPanel } from "./NetworkPanel";
import { LlmPanel } from "./LlmPanel";

interface SparkPageProps {
  spark: SparkSnapshot;
  temperatureUnit: "celsius" | "fahrenheit";
  onEdit?: () => void;
}

export function SparkPage({ spark, temperatureUnit, onEdit }: SparkPageProps) {
  const { metrics } = spark;
  const [disabledDevices, setDisabledDevices] = useState<string[]>(spark.disabledDevices || []);
  const [disabledInterfaces, setDisabledInterfaces] = useState<string[]>(
    spark.disabledInterfaces || []
  );
  const [llmPort, setLlmPort] = useState<number>(spark.llmPort ?? 8888);
  const [storagePollDisabled, setStoragePollDisabled] = useState<boolean>(
    spark.storagePollDisabled ?? false
  );

  // Sync when spark data changes (WS push)
  useEffect(() => {
    setDisabledDevices(spark.disabledDevices || []);
  }, [spark.disabledDevices]);

  useEffect(() => {
    setDisabledInterfaces(spark.disabledInterfaces || []);
  }, [spark.disabledInterfaces]);

  useEffect(() => {
    if (spark.llmPort != null) setLlmPort(spark.llmPort);
  }, [spark.llmPort]);

  useEffect(() => {
    setStoragePollDisabled(spark.storagePollDisabled ?? false);
  }, [spark.storagePollDisabled]);

  const handleStoragePollModeChange = useCallback(
    async (disabled: boolean) => {
      setStoragePollDisabled(disabled);
      try {
        await updateSpark(spark.id, { storagePollDisabled: disabled });
        // When disabling auto-refresh, do one manual refresh immediately
        if (disabled) {
          refreshSparkMetric(spark.id, "storage").catch((err) =>
            console.error("Failed to refresh storage after disabling auto-refresh:", err)
          );
        }
      } catch (err) {
        console.error("Failed to update storage poll mode:", err);
        setStoragePollDisabled(!disabled); // revert
      }
    },
    [spark.id]
  );

  return (
    <div className="space-y-[18px]">
      <SparkHeader spark={spark} onEdit={onEdit} />
      <div className="spark-page grid gap-[18px] md:grid-cols-2">
        <GpuPanel gpu={metrics.gpu} temperatureUnit={temperatureUnit} />
        <CpuPanel cpu={metrics.cpu} ram={metrics.ram} unifiedMemory={metrics.unifiedMemory} />
        <StoragePanel
          storage={metrics.storage}
          sparkId={spark.id}
          disabledDevices={disabledDevices}
          onDisabledChange={setDisabledDevices}
          storagePollDisabled={storagePollDisabled}
          onStoragePollModeChange={handleStoragePollModeChange}
        />
        <NetworkPanel
          network={metrics.network}
          sparkId={spark.id}
          disabledInterfaces={disabledInterfaces}
          onDisabledChange={setDisabledInterfaces}
        />
        <LlmPanel
          llm={metrics.llm}
          sparkId={spark.id}
          llmPort={llmPort}
          onLlmPortChange={setLlmPort}
          className="md:col-span-2"
        />
      </div>
    </div>
  );
}