import { spawn } from "node:child_process";

const REQUEST_TIMEOUT_MS = 7000;
const MAX_ICON_BYTES = 256 * 1024;

const PAGE_HEADERS = {
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "User-Agent": "AIDC/0.1 (favicon-fetcher)"
};

const ICON_HEADERS = {
  "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
  "User-Agent": "AIDC/0.1 (favicon-fetcher)"
};

function dedupe(items: string[]): string[] {
  return [...new Set(items)];
}

function googleFaviconUrl(hostname: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=128`;
}

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

function builtInFallbackIcon(siteUrl: URL): string | null {
  const host = siteUrl.hostname.toLowerCase();

  if (host === "chatgpt.com" || host.endsWith(".chatgpt.com")) {
    const label = "GPT";
    return svgDataUrl(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">`
        + `<rect width="64" height="64" rx="14" fill="#111827"/>`
        + `<text x="32" y="40" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="700" fill="#ffffff">${label}</text>`
        + `</svg>`
    );
  }

  if (host === "openai.com" || host.endsWith(".openai.com")) {
    return svgDataUrl(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">`
        + `<rect width="64" height="64" rx="14" fill="#0f172a"/>`
        + `<text x="32" y="40" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="700" fill="#ffffff">AI</text>`
        + `</svg>`
    );
  }

  return null;
}

type FetchFn = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

function resolveRuntimeFetch(): FetchFn {
  if (process.versions.electron) {
    try {
      const electron = require("electron") as {
        net?: { fetch?: FetchFn };
        session?: {
          defaultSession?: { fetch?: FetchFn };
        };
      };
      if (typeof electron.net?.fetch === "function") {
        return electron.net.fetch.bind(electron.net);
      }
      if (typeof electron.session?.defaultSession?.fetch === "function") {
        return electron.session.defaultSession.fetch.bind(electron.session.defaultSession);
      }
    } catch {
      // Fall back to global fetch.
    }
  }

  return globalThis.fetch.bind(globalThis);
}

function cleanContentType(value: string | null): string | null {
  if (!value) {
    return null;
  }
  return value.split(";")[0]?.trim().toLowerCase() || null;
}

function guessMimeFromUrl(url: string): string | null {
  const pathname = (() => {
    try {
      return new URL(url).pathname.toLowerCase();
    } catch {
      return "";
    }
  })();

  if (pathname.endsWith(".svg")) {
    return "image/svg+xml";
  }
  if (pathname.endsWith(".png")) {
    return "image/png";
  }
  if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (pathname.endsWith(".webp")) {
    return "image/webp";
  }
  if (pathname.endsWith(".ico")) {
    return "image/x-icon";
  }

  return null;
}

function pickMime(contentType: string | null, url: string): string | null {
  const normalized = cleanContentType(contentType);
  if (normalized?.startsWith("image/")) {
    return normalized;
  }
  return guessMimeFromUrl(url);
}

function extractAttr(tag: string, attr: string): string | null {
  const pattern = new RegExp(`\\b${attr}\\s*=\\s*(\"([^\"]*)\"|'([^']*)'|([^\\s>]+))`, "i");
  const match = pattern.exec(tag);
  if (!match) {
    return null;
  }
  return (match[2] || match[3] || match[4] || "").trim() || null;
}

function extractIconCandidates(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const linkTags = html.match(/<link\b[^>]*>/gi) || [];

  for (const tag of linkTags) {
    const rel = (extractAttr(tag, "rel") || "").toLowerCase();
    if (!rel.includes("icon")) {
      continue;
    }

    const href = extractAttr(tag, "href");
    if (!href) {
      continue;
    }

    try {
      links.push(new URL(href, baseUrl).toString());
    } catch {
      continue;
    }
  }

  return dedupe(links);
}

function pathPrefixes(pathname: string): string[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 0) {
    return [];
  }

  const last = segments[segments.length - 1];
  if (last && last.includes(".")) {
    segments.pop();
  }

  const prefixes: string[] = [];
  for (let size = segments.length; size >= 1; size -= 1) {
    prefixes.push(`/${segments.slice(0, size).join("/")}`);
  }
  return dedupe(prefixes);
}

function pathScopedIconCandidates(url: URL): string[] {
  const candidates: string[] = [];
  for (const prefix of pathPrefixes(url.pathname)) {
    candidates.push(new URL(`${prefix}/favicon.ico`, url.origin).toString());
    candidates.push(new URL(`${prefix}/apple-touch-icon.png`, url.origin).toString());
  }
  return dedupe(candidates);
}

function rootIconCandidates(url: URL): string[] {
  return dedupe([
    new URL("/favicon.ico", url.origin).toString(),
    new URL("/apple-touch-icon.png", url.origin).toString()
  ]);
}

async function fetchText(fetchFn: FetchFn, url: string): Promise<{ html: string; finalUrl: string } | null> {
  try {
    const response = await fetchFn(url, {
      headers: PAGE_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
    if (!response.ok) {
      return null;
    }

    const contentType = cleanContentType(response.headers.get("content-type"));
    if (contentType && !contentType.includes("html")) {
      return null;
    }

    const html = (await response.text()).slice(0, 300_000);
    return { html, finalUrl: response.url || url };
  } catch {
    return null;
  }
}

async function fetchIconDataUrl(fetchFn: FetchFn, url: string): Promise<string | null> {
  try {
    const response = await fetchFn(url, {
      headers: ICON_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
    if (!response.ok) {
      return null;
    }

    const mime = pickMime(response.headers.get("content-type"), response.url || url);
    if (!mime) {
      return null;
    }

    const raw = Buffer.from(await response.arrayBuffer());
    if (raw.length <= 0 || raw.length > MAX_ICON_BYTES) {
      return null;
    }

    return `data:${mime};base64,${raw.toString("base64")}`;
  } catch {
    return null;
  }
}

function runCurl(args: string[], maxBuffer: number, timeoutMs: number): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const child = spawn("curl", args, {
      stdio: ["ignore", "pipe", "ignore"]
    });
    const chunks: Buffer[] = [];
    let bytes = 0;
    let settled = false;
    let overflow = false;

    const finalize = (output: Buffer | null) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutId);
      resolve(output);
    };

    const timeoutId = setTimeout(() => {
      child.kill("SIGKILL");
      finalize(null);
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer | string) => {
      const payload = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytes += payload.length;
      if (bytes > maxBuffer) {
        overflow = true;
        child.kill("SIGKILL");
        return;
      }
      chunks.push(payload);
    });

    child.on("error", () => {
      finalize(null);
    });

    child.on("close", (code) => {
      if (code !== 0 || overflow) {
        finalize(null);
        return;
      }
      finalize(Buffer.concat(chunks));
    });
  });
}

async function fetchIconDataUrlByCurl(url: string): Promise<string | null> {
  const head = await runCurl(
    [
      "-fsSLI",
      "--max-time",
      "12",
      "--connect-timeout",
      "5",
      url
    ],
    64 * 1024,
    13_000
  );
  if (!head) {
    return null;
  }

  const contentTypeMatches = [...head.toString("utf8").matchAll(/^content-type:\s*([^\r\n]+)/gim)];
  const contentType = contentTypeMatches.length > 0
    ? contentTypeMatches[contentTypeMatches.length - 1]?.[1] || null
    : null;
  const mime = pickMime(contentType, url);
  if (!mime) {
    return null;
  }

  const raw = await runCurl(
    [
      "-fsSL",
      "--max-time",
      "12",
      "--connect-timeout",
      "5",
      url
    ],
    MAX_ICON_BYTES + 1024,
    13_000
  );
  if (!raw) {
    return null;
  }

  if (raw.length <= 0 || raw.length > MAX_ICON_BYTES) {
    return null;
  }

  return `data:${mime};base64,${raw.toString("base64")}`;
}

export class ProviderIconService {
  private readonly fetchFn: FetchFn;

  constructor() {
    this.fetchFn = resolveRuntimeFetch();
  }

  async fetchIconDataUrl(siteUrl: string): Promise<string | null> {
    let url: URL;
    try {
      url = new URL(siteUrl);
    } catch {
      return null;
    }

    const page = await fetchText(this.fetchFn, url.toString());
    const finalUrl = new URL(page?.finalUrl || url.toString());
    const candidates = dedupe([
      ...(page ? extractIconCandidates(page.html, finalUrl.toString()) : []),
      ...pathScopedIconCandidates(finalUrl),
      ...rootIconCandidates(finalUrl)
    ]);

    for (const candidate of candidates) {
      const iconDataUrl = await fetchIconDataUrl(this.fetchFn, candidate);
      if (iconDataUrl) {
        return iconDataUrl;
      }
    }

    // Fallback for anti-bot protected sites (e.g. Cloudflare challenge on /favicon.ico).
    const thirdPartyFallback = await fetchIconDataUrl(this.fetchFn, googleFaviconUrl(finalUrl.hostname));
    if (thirdPartyFallback) {
      return thirdPartyFallback;
    }

    // Last fallback for proxy-heavy environments where Node/Electron fetch may fail
    // but curl can still reach the target through user proxy tooling.
    const curlFallback = await fetchIconDataUrlByCurl(googleFaviconUrl(finalUrl.hostname));
    if (curlFallback) {
      return curlFallback;
    }

    const builtInFallback = builtInFallbackIcon(finalUrl);
    if (builtInFallback) {
      return builtInFallback;
    }

    return null;
  }
}
