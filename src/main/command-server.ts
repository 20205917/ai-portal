import fs from "node:fs";
import net from "node:net";

import type {
  CommandPayload,
  CommandResponse
} from "../shared/commands";
import { isNamedPipeEndpoint } from "./paths";

const MAX_MESSAGE_SIZE = 64 * 1024;

type FsAdapter = Pick<typeof fs, "existsSync" | "unlinkSync" | "chmodSync">;

interface CommandServerDependencies {
  fsAdapter?: FsAdapter;
  server?: net.Server;
}

function createErrorResponse(message: string): CommandResponse {
  return {
    ok: false,
    state: "stopped",
    activeProviderId: "chatgpt",
    updatedAt: new Date().toISOString(),
    error: message
  };
}

export class CommandServer {
  private readonly server: net.Server;
  private readonly fsAdapter: FsAdapter;

  constructor(
    private readonly socketPath: string,
    private readonly onCommand: (command: CommandPayload) => Promise<CommandResponse>,
    dependencies: CommandServerDependencies = {}
  ) {
    this.server = dependencies.server ?? net.createServer(this.handleConnection.bind(this));
    this.fsAdapter = dependencies.fsAdapter ?? fs;
  }

  async listen(): Promise<void> {
    this.cleanupSocketFile();

    await new Promise<void>((resolve, reject) => {
      this.server.once("error", reject);
      this.server.listen(this.socketPath, () => resolve());
    });

    if (!isNamedPipeEndpoint(this.socketPath)) {
      this.fsAdapter.chmodSync(this.socketPath, 0o600);
    }
  }

  close(): void {
    this.cleanupSocketFile();
    this.server.close();
  }

  private cleanupSocketFile(): void {
    if (isNamedPipeEndpoint(this.socketPath)) {
      return;
    }
    if (this.fsAdapter.existsSync(this.socketPath)) {
      this.fsAdapter.unlinkSync(this.socketPath);
    }
  }

  private handleConnection(socket: net.Socket): void {
    let buffer = "";
    let handled = false;

    socket.on("data", (chunk) => {
      if (handled) {
        return;
      }

      buffer += chunk.toString("utf8");
      if (buffer.length > MAX_MESSAGE_SIZE) {
        handled = true;
        this.send(socket, createErrorResponse("Command payload too large."));
        return;
      }

      const newlineIndex = buffer.indexOf("\n");
      if (newlineIndex === -1) {
        return;
      }

      const raw = buffer.slice(0, newlineIndex).trim();
      handled = true;
      void this.respond(socket, raw);
    });

    socket.on("end", () => {
      if (handled) {
        return;
      }

      const raw = buffer.trim();
      if (!raw) {
        handled = true;
        this.send(socket, createErrorResponse("Empty command payload."));
        return;
      }

      handled = true;
      void this.respond(socket, raw);
    });
  }

  private async respond(socket: net.Socket, raw: string): Promise<void> {
    try {
      const command = JSON.parse(raw) as CommandPayload;
      const response = await this.onCommand(command);
      this.send(socket, response);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.send(socket, createErrorResponse(message));
    }
  }

  private send(socket: net.Socket, response: CommandResponse): void {
    if (socket.destroyed) {
      return;
    }

    socket.end(JSON.stringify(response));
  }
}
