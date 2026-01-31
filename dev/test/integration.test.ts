import { afterEach, beforeEach, describe, test } from "bun:test";
import { rm } from "fs/promises";
import { resolve } from "path";
import { build } from "../packager";
import type { IPCMessage } from "../types";
import { Connection } from "./resources/bceIntegration/connection";

describe("bce integration", () => {
  let originalManifestContent: string;
  const cwd = resolve(import.meta.dir, "resources/bceIntegration");
  const dist = resolve(cwd, "dist");
  const run = resolve(cwd, "run");
  const manifestPath = resolve(cwd, "manifest.ts");
  const solaceSrcPath = resolve(cwd, "src/solace.ts");
  const distManifestPath = resolve(dist, "manifest.json");
  const distSolacePath = resolve(dist, "src/solace.js");

  beforeEach(async () => {
    originalManifestContent = await Bun.file(manifestPath).text();
    await rm(dist, { recursive: true, force: true });
    await rm(run, { recursive: true, force: true });
  });

  afterEach(async () => {
    await Bun.write(manifestPath, originalManifestContent);
    await rm(dist, { recursive: true, force: true });
    await rm(run, { recursive: true, force: true });
  });

  test("dev server watches for changes and rebuilds correctly", async () => {
    await build(run);

    const proc = Bun.spawn(["bun", resolve(run, "bce.js"), "--dev"], {
      cwd,
      env: { ...process.env, LOCAL: "true" },
      stdout: "inherit",
      stderr: "inherit",
      stdin: "pipe",
      ipc(message: IPCMessage) {
        if (message === "rebuild complete") {
          console.log("IPC message:", message);
        } else if (message === "websocket ready") {
          new Connection().connect();
        } else {
          console.log("Unknown IPC message:", message);
        }
      },
    });

    await Bun.sleep(2000);

    if (proc.kill) proc.kill("SIGINT");
    await proc.exited;
  });
});
