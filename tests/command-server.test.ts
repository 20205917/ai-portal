import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { CommandServer } from "../src/main/command-server";
import type { CommandPayload, CommandResponse } from "../src/shared/commands";

let activeServer: CommandServer | null = null;
let activeTempDir = "";

afterEach(() => {
  activeServer?.close();
  activeServer = null;
  if (activeTempDir) {
    fs.rmSync(activeTempDir, { recursive: true, force: true });
    activeTempDir = "";
  }
});

function makeRuntime(): Pick<CommandResponse, "state" | "activeProviderId" | "updatedAt"> {
  return {
    state: "hidden",
    activeProviderId: "chatgpt",
    updatedAt: new Date().toISOString()
  };
}

function setupServer(handler: (command: CommandPayload) => Promise<CommandResponse>) {
  activeTempDir = fs.mkdtempSync(path.join(os.tmpdir(), "aidc-command-server-"));
  const socketPath = path.join(activeTempDir, "aidc.sock");
  activeServer = new CommandServer(socketPath, handler);
  return { socketPath, server: activeServer };
}

function send(socketPath: string, writer: (socket: net.Socket) => void): Promise<CommandResponse> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(socketPath);
    let raw = "";

    socket.on("connect", () => {
      writer(socket);
    });
    socket.on("data", (chunk) => {
      raw += chunk.toString("utf8");
    });
    socket.on("end", () => {
      try {
        resolve(JSON.parse(raw) as CommandResponse);
      } catch (error) {
        reject(error);
      }
    });
    socket.on("error", reject);
  });
}

describe("CommandServer", () => {
  it("accepts line payload split across packets", async () => {
    const received: CommandPayload[] = [];
    const { socketPath, server } = setupServer(async (command) => {
      received.push(command);
      return {
        ok: true,
        ...makeRuntime()
      };
    });
    await server.listen();

    const response = await send(socketPath, (socket) => {
      socket.write("{\"command\":\"sta");
      setTimeout(() => {
        socket.end("tus\"}\n");
      }, 5);
    });

    expect(response.ok).toBe(true);
    expect(received).toEqual([{ command: "status" }]);
  });

  it("returns structured error for bad json payload", async () => {
    const { socketPath, server } = setupServer(async () => ({
      ok: true,
      ...makeRuntime()
    }));
    await server.listen();

    const response = await send(socketPath, (socket) => {
      socket.end("not-json\n");
    });

    expect(response.ok).toBe(false);
    expect(response.error).toBeTruthy();
    expect(response.state).toBe("stopped");
  });

  it("returns empty payload error when client closes without command", async () => {
    const { socketPath, server } = setupServer(async () => ({
      ok: true,
      ...makeRuntime()
    }));
    await server.listen();

    const response = await send(socketPath, (socket) => {
      socket.end();
    });

    expect(response.ok).toBe(false);
    expect(response.error).toMatch(/empty command payload/i);
    expect(response.state).toBe("stopped");
  });
});
