import { useEffect, useState } from "react";

import type { SystemMetricsSnapshot } from "../../../shared/types";

const defaultMetrics: SystemMetricsSnapshot = {
  cpuPercent: 0,
  memoryMb: 0,
  privateMemoryMb: 0,
  privateMemorySupported: false,
  processCount: 0,
  memoryByProcessType: {
    browserMb: 0,
    gpuMb: 0,
    tabMb: 0,
    networkServiceMb: 0,
    utilityMb: 0,
    otherMb: 0
  },
  updatedAt: ""
};

export function useSystemMetrics(intervalMs: number): SystemMetricsSnapshot {
  const [metrics, setMetrics] = useState<SystemMetricsSnapshot>(defaultMetrics);

  useEffect(() => {
    let disposed = false;

    const syncMetrics = async () => {
      try {
        const snapshot = await window.aidc.getSystemMetrics();
        if (!disposed) {
          setMetrics(snapshot);
        }
      } catch {
        if (!disposed) {
          setMetrics((current) => (current.updatedAt ? current : defaultMetrics));
        }
      }
    };

    void syncMetrics();
    const timer = window.setInterval(() => {
      void syncMetrics();
    }, intervalMs);

    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [intervalMs]);

  return metrics;
}
