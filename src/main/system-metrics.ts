import type { ProcessMetric } from "electron";

import type { SystemMetricsSnapshot } from "../shared/types";

function roundToSingleDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

interface MemoryBreakdownKb {
  browserKb: number;
  gpuKb: number;
  tabKb: number;
  networkServiceKb: number;
  utilityKb: number;
  otherKb: number;
}

function emptyMemoryBreakdownKb(): MemoryBreakdownKb {
  return {
    browserKb: 0,
    gpuKb: 0,
    tabKb: 0,
    networkServiceKb: 0,
    utilityKb: 0,
    otherKb: 0
  };
}

function resolveWorkingSetSizeKb(metric: ProcessMetric): number {
  const workingSet = metric.memory?.workingSetSize;
  if (Number.isFinite(workingSet) && workingSet > 0) {
    return workingSet;
  }
  return 0;
}

function resolvePrivateSizeKb(metric: ProcessMetric): number {
  const privateSize = metric.memory?.privateBytes;
  if (typeof privateSize === "number" && Number.isFinite(privateSize) && privateSize > 0) {
    return privateSize;
  }
  return 0;
}

function hasPrivateSize(metric: ProcessMetric): boolean {
  const privateSize = metric.memory?.privateBytes;
  if (typeof privateSize !== "number" || !Number.isFinite(privateSize)) {
    return false;
  }
  return privateSize >= 0;
}

function isNetworkService(metric: ProcessMetric): boolean {
  const name = `${metric.name ?? ""} ${metric.serviceName ?? ""}`.toLowerCase();
  return name.includes("network service");
}

function addToMemoryBreakdown(metric: ProcessMetric, workingSetKb: number, breakdown: MemoryBreakdownKb): void {
  if (workingSetKb <= 0) {
    return;
  }
  if (metric.type === "Browser") {
    breakdown.browserKb += workingSetKb;
    return;
  }
  if (metric.type === "GPU") {
    breakdown.gpuKb += workingSetKb;
    return;
  }
  if (metric.type === "Tab") {
    breakdown.tabKb += workingSetKb;
    return;
  }
  if (metric.type === "Utility") {
    if (isNetworkService(metric)) {
      breakdown.networkServiceKb += workingSetKb;
      return;
    }
    breakdown.utilityKb += workingSetKb;
    return;
  }
  breakdown.otherKb += workingSetKb;
}

export function aggregateSystemMetrics(metrics: ProcessMetric[]): SystemMetricsSnapshot {
  const totals = metrics.reduce(
    (accumulator, metric) => {
      const cpu = metric.cpu?.percentCPUUsage;
      if (Number.isFinite(cpu)) {
        accumulator.cpuPercent += cpu;
      }

      const workingSetSizeKb = resolveWorkingSetSizeKb(metric);
      accumulator.memoryKb += workingSetSizeKb;

      const privateSizeKb = resolvePrivateSizeKb(metric);
      accumulator.privateMemoryKb += privateSizeKb;
      if (hasPrivateSize(metric)) {
        accumulator.privateMemorySampleCount += 1;
      }

      addToMemoryBreakdown(metric, workingSetSizeKb, accumulator.memoryByProcessType);
      accumulator.processCount += 1;

      return accumulator;
    },
    {
      cpuPercent: 0,
      memoryKb: 0,
      privateMemoryKb: 0,
      privateMemorySampleCount: 0,
      processCount: 0,
      memoryByProcessType: emptyMemoryBreakdownKb()
    }
  );

  return {
    cpuPercent: roundToSingleDecimal(Math.max(0, totals.cpuPercent)),
    memoryMb: roundToSingleDecimal(Math.max(0, totals.memoryKb / 1024)),
    privateMemoryMb: roundToSingleDecimal(Math.max(0, totals.privateMemoryKb / 1024)),
    privateMemorySupported: totals.privateMemorySampleCount > 0,
    processCount: totals.processCount,
    memoryByProcessType: {
      browserMb: roundToSingleDecimal(Math.max(0, totals.memoryByProcessType.browserKb / 1024)),
      gpuMb: roundToSingleDecimal(Math.max(0, totals.memoryByProcessType.gpuKb / 1024)),
      tabMb: roundToSingleDecimal(Math.max(0, totals.memoryByProcessType.tabKb / 1024)),
      networkServiceMb: roundToSingleDecimal(Math.max(0, totals.memoryByProcessType.networkServiceKb / 1024)),
      utilityMb: roundToSingleDecimal(Math.max(0, totals.memoryByProcessType.utilityKb / 1024)),
      otherMb: roundToSingleDecimal(Math.max(0, totals.memoryByProcessType.otherKb / 1024))
    },
    updatedAt: new Date().toISOString()
  };
}
