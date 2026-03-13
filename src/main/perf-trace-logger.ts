import fs from "node:fs";
import path from "node:path";

type PerfEventType = "reveal_shown" | "reveal_seen";

export interface PerfTraceEntry {
  type: PerfEventType;
  traceId: string;
  source: string;
  loggedAt: string;
  hiddenDurationMs?: number;
  triggerLoopLagMs?: number;
  windowActionQueueDelayMs?: number;
  windowActionPendingAtEnqueue?: number;
  clientSentAtMs?: number;
  triggeredAtMs: number;
  shownAtMs?: number;
  seenAtMs?: number;
  triggerToShownMs?: number;
  triggerToSeenMs?: number;
  shownToSeenMs?: number;
  inputToShownMs?: number;
  inputToSeenMs?: number;
}

export class PerfTraceLogger {
  private readonly tracePath: string;
  private appendQueue: Promise<void> = Promise.resolve();

  constructor() {
    this.tracePath = process.env.AIPROTAL_PERF_TRACE_PATH?.trim()
      || path.resolve(process.cwd(), "artifacts/perf/reveal-latency.jsonl");
  }

  log(entry: PerfTraceEntry): void {
    const line = `${JSON.stringify(entry)}\n`;
    this.appendQueue = this.appendQueue
      .catch(() => undefined)
      .then(async () => {
        try {
          await fs.promises.mkdir(path.dirname(this.tracePath), { recursive: true });
          await fs.promises.appendFile(this.tracePath, line, "utf8");
        } catch (error) {
          console.error("[AIDC] Failed to append perf trace:", error instanceof Error ? error.message : String(error));
        }
      });
  }
}
