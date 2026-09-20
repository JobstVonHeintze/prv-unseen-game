import { cpSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { loadCanon, assertValid } from "@contrejour/canon";
import { createApi, createStore } from "@contrejour/api";
import type { Server } from "node:http";

export function loadSlice() {
  const canon = loadCanon(resolve(import.meta.dirname, "../canon"));
  assertValid(canon);
  return canon;
}

export async function serveSlice(): Promise<{
  url: string;
  close: () => Promise<void>;
  dataDir: string;
  canonDir: string;
}> {
  const canonDir = mkdtempSync(join(tmpdir(), "cj-canon-"));
  cpSync(resolve(import.meta.dirname, "../canon"), canonDir, { recursive: true });
  const canon = loadCanon(canonDir);
  assertValid(canon);
  const dataDir = mkdtempSync(join(tmpdir(), "cj-"));
  const server: Server = createApi(canon, createStore(dataDir), { canonRoot: canonDir });
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", () => resolveListen()));
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("no port");
  return {
    url: `http://127.0.0.1:${addr.port}`,
    dataDir,
    canonDir,
    close: () => new Promise((r) => server.close(() => r())),
  };
}

export async function json(url: string, path: string, init?: RequestInit) {
  const res = await fetch(`${url}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await res.json();
  return { status: res.status, body };
}
