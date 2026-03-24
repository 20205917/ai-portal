import type { SystemMetricsSnapshot } from "../shared/types";

export function createFallbackSystemMetricsSnapshot(): SystemMetricsSnapshot {
  return {
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
    updatedAt: new Date().toISOString()
  };
}
