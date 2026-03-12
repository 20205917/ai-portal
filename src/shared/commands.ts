import type { RuntimeSnapshot } from "./types";

export type CommandName = "toggle" | "show" | "hide" | "open" | "status" | "next" | "prev";

export interface CommandTrace {
  requestId?: string;
  clientSentAtMs?: number;
}

export interface ToggleCommandTiming {
  requestId?: string;
  clientSentAtMs?: number;
  serverReceivedAtMs: number;
  serverHandledAtMs: number;
  clientToServerMs?: number;
  serverHandleMs: number;
  endToEndMs?: number;
  resultingState: RuntimeSnapshot["state"];
  activeProviderId: string;
  updatedAt: string;
}

export interface CommandDiagnostics {
  lastToggle?: ToggleCommandTiming;
}

export interface CommandPayload {
  command: CommandName;
  providerId?: string;
  trace?: CommandTrace;
}

export interface CommandResponse extends RuntimeSnapshot {
  ok: boolean;
  error?: string;
  diagnostics?: CommandDiagnostics;
}

const validCommands: CommandName[] = ["toggle", "show", "hide", "open", "status", "next", "prev"];

export function parseAidcArgs(argv: string[]): CommandPayload | null {
  const index = argv.findIndex((value) =>
    validCommands.includes(value as CommandName)
  );

  if (index === -1) {
    return null;
  }

  const command = argv[index] as CommandName;

  if (command === "open") {
    const providerId = argv[index + 1];

    if (!providerId) {
      throw new Error("Command 'open' requires a providerId.");
    }

    return { command, providerId };
  }

  return { command };
}
