import type { ProcessMetric } from "electron";

import type { SystemMetricsSnapshot } from "../shared/types";

function roundToSingleDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export function aggregateSystemMetrics(metrics: ProcessMetric[]): SystemMetricsSnapshot {
  const totals = metrics.reduce(
    (accumulator, metric) => {
      const cpu = metric.cpu?.percentCPUUsage;
      if (Number.isFinite(cpu)) {
        accumulator.cpuPercent += cpu;
      }

      const workingSetSizeKb = metric.memory?.workingSetSize;
      if (Number.isFinite(workingSetSizeKb)) {
        accumulator.memoryKb += workingSetSizeKb;
      }

      return accumulator;
    },
    {
      cpuPercent: 0,
      memoryKb: 0
    }
  );

  return {
    cpuPercent: roundToSingleDecimal(Math.max(0, totals.cpuPercent)),
    memoryMb: roundToSingleDecimal(Math.max(0, totals.memoryKb / 1024)),
    updatedAt: new Date().toISOString()
  };
}
