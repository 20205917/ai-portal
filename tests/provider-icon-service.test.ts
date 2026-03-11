import http from "node:http";
import type { AddressInfo } from "node:net";

import { afterEach, describe, expect, it } from "vitest";

import { ProviderIconService } from "../src/main/provider-icon-service";

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7+LwAAAABJRU5ErkJggg==",
  "base64"
);

const servers: http.Server[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => {
    server.close(() => resolve());
  })));
});

function startServer(
  handler: (request: http.IncomingMessage, response: http.ServerResponse) => void
): Promise<string> {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    servers.push(server);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address() as AddressInfo;
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

describe("ProviderIconService", () => {
  it("extracts icon from link rel=icon", async () => {
    const baseUrl = await startServer((request, response) => {
      if (request.url === "/app-icon.png") {
        response.writeHead(200, { "Content-Type": "image/png" });
        response.end(tinyPng);
        return;
      }
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end("<html><head><link rel='icon' href='/app-icon.png'></head><body>ok</body></html>");
    });

    const service = new ProviderIconService();
    const icon = await service.fetchIconDataUrl(baseUrl);

    expect(icon).toMatch(/^data:image\/png;base64,/);
  });

  it("falls back to /favicon.ico when page fetch fails", async () => {
    const ico = Buffer.from([0, 0, 1, 0, 1, 0]);
    const baseUrl = await startServer((request, response) => {
      if (request.url === "/favicon.ico") {
        response.writeHead(200, { "Content-Type": "application/octet-stream" });
        response.end(ico);
        return;
      }
      response.writeHead(404, { "Content-Type": "text/plain" });
      response.end("not found");
    });

    const service = new ProviderIconService();
    const icon = await service.fetchIconDataUrl(`${baseUrl}/no-page`);

    expect(icon).toMatch(/^data:image\/x-icon;base64,/);
  });

  it("prefers path-scoped favicon before root favicon", async () => {
    const nestedIco = Buffer.from([1, 2, 3, 4, 5, 6]);
    const rootIco = Buffer.from([9, 8, 7, 6, 5, 4]);
    const baseUrl = await startServer((request, response) => {
      if (request.url === "/codex/favicon.ico") {
        response.writeHead(200, { "Content-Type": "application/octet-stream" });
        response.end(nestedIco);
        return;
      }

      if (request.url === "/favicon.ico") {
        response.writeHead(200, { "Content-Type": "application/octet-stream" });
        response.end(rootIco);
        return;
      }

      response.writeHead(404, { "Content-Type": "text/plain" });
      response.end("not found");
    });

    const service = new ProviderIconService();
    const icon = await service.fetchIconDataUrl(`${baseUrl}/codex`);

    expect(icon).toBe(`data:image/x-icon;base64,${nestedIco.toString("base64")}`);
  });
});
