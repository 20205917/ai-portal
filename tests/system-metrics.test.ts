import type { ProcessMetric } from "electron";
import { afterEach, describe, expect, it, vi } from "vitest";

import { aggregateSystemMetrics } from "../src/main/system-metrics";

describe("aggregateSystemMetrics", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("aggregates cpu and memory metrics", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-12T03:20:00.000Z"));

    const metrics = [
      {
        type: "Browser",
        cpu: { percentCPUUsage: 4.26 },
        memory: { workingSetSize: 2048, privateBytes: 1536 }
      },
      {
        type: "Utility",
        serviceName: "Network Service",
        cpu: { percentCPUUsage: 1.34 },
        memory: { workingSetSize: 1024, privateBytes: 768 }
      }
    ] as ProcessMetric[];

    const snapshot = aggregateSystemMetrics(metrics);
    expect(snapshot).toEqual({
      cpuPercent: 5.6,
      memoryMb: 3,
      privateMemoryMb: 2.3,
      privateMemorySupported: true,
      processCount: 2,
      memoryByProcessType: {
        browserMb: 2,
        gpuMb: 0,
        tabMb: 0,
        networkServiceMb: 1,
        utilityMb: 0,
        otherMb: 0
      },
      updatedAt: "2026-03-12T03:20:00.000Z"
    });
  });

  it("returns zero values when metrics are empty or invalid", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-12T03:20:01.000Z"));

    const metrics = [
      {
        type: "Unknown",
        cpu: { percentCPUUsage: Number.NaN },
        memory: { workingSetSize: -1024, privateBytes: -1024 }
      }
    ] as ProcessMetric[];

    const snapshot = aggregateSystemMetrics(metrics);
    expect(snapshot).toEqual({
      cpuPercent: 0,
      memoryMb: 0,
      privateMemoryMb: 0,
      privateMemorySupported: false,
      processCount: 1,
      memoryByProcessType: {
        browserMb: 0,
        gpuMb: 0,
        tabMb: 0,
        networkServiceMb: 0,
        utilityMb: 0,
        otherMb: 0
      },
      updatedAt: "2026-03-12T03:20:01.000Z"
    });
  });
});
