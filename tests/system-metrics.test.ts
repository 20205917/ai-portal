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
        cpu: { percentCPUUsage: 4.26 },
        memory: { workingSetSize: 2048 }
      },
      {
        cpu: { percentCPUUsage: 1.34 },
        memory: { workingSetSize: 1024 }
      }
    ] as ProcessMetric[];

    const snapshot = aggregateSystemMetrics(metrics);
    expect(snapshot).toEqual({
      cpuPercent: 5.6,
      memoryMb: 3,
      updatedAt: "2026-03-12T03:20:00.000Z"
    });
  });

  it("returns zero values when metrics are empty or invalid", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-12T03:20:01.000Z"));

    const metrics = [
      {
        cpu: { percentCPUUsage: Number.NaN },
        memory: { workingSetSize: -1024 }
      }
    ] as ProcessMetric[];

    const snapshot = aggregateSystemMetrics(metrics);
    expect(snapshot).toEqual({
      cpuPercent: 0,
      memoryMb: 0,
      updatedAt: "2026-03-12T03:20:01.000Z"
    });
  });
});
