import type { RuntimeSnapshot } from "./types";

export type CommandName = "toggle" | "show" | "hide" | "open" | "status";

export interface CommandPayload {
  command: CommandName;
  providerId?: string;
}

export interface CommandResponse extends RuntimeSnapshot {
  ok: boolean;
  error?: string;
}

const validCommands: CommandName[] = ["toggle", "show", "hide", "open", "status"];

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
