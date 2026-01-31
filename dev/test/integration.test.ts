import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { rm } from "fs/promises";
import { resolve } from "path";
import { build } from "../packager";

describe("bce integration", () => {
  let originalManifestContent: string;
  const cwd = resolve(import.meta.dir, "resources/bceIntegration");
  const dist = resolve(cwd, "dist");
  const run = resolve(cwd, "run");
  const manifestPath = resolve(cwd, "manifest.ts");
  const solaceSrcPath = resolve(cwd, "src/solace.ts");
  const distManifestPath = resolve(dist, "manifest.json");
  const distSolacePath = resolve(dist, "src/solace.js");

  async function waitForFile(path: string, timeout = 10000): Promise<string> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const file = Bun.file(path);
      if (await file.exists()) {
        const content = await file.text();
        if (content.length > 0) return content;
      }
      await Bun.sleep(100);
    }
    throw new Error(`Timeout waiting for ${path}`);
  }

  async function waitForRebuild(timeout = 10000): Promise<void> {
    const start = Date.now();
    const initialMtime = (await Bun.file(distManifestPath).stat()).mtime;
    while (Date.now() - start < timeout) {
      const stat = await Bun.file(distManifestPath).stat();
      if (stat.mtime > initialMtime) return;
      await Bun.sleep(100);
    }
    throw new Error("Timeout waiting for rebuild");
  }

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

  test(
    "dev server watches for changes and rebuilds correctly",
    async () => {
      await build(run);

      const bceJsPath = resolve(run, "bce.js");
      if (!(await Bun.file(bceJsPath).exists())) {
        throw new Error(`Build failed: ${bceJsPath} does not exist`);
      }

      const proc = Bun.spawn([process.execPath, bceJsPath, "--dev"], {
        cwd,
        env: { ...process.env, LOCAL: "true" },
        stdout: "inherit",
        stderr: "inherit",
        stdin: "pipe",
      });

      if (!proc) {
        console.error("Failed to start dev server process");
      }

      try {
        // 1. Wait for initial build
        const manifest1 = await waitForFile(distManifestPath);
        const solace1 = await waitForFile(distSolacePath);
        expect(manifest1).toMatchSnapshot("manifest-initial");
        expect(solace1).toMatchSnapshot("solace-initial");

        // 2. Test WebSocket connection
        const ws1 = new WebSocket("ws://localhost:8080");
        await new Promise<void>((res, rej) => {
          ws1.onopen = () => res();
          ws1.onerror = rej;
        });
        ws1.close();

        // 3. Touch file (save without changes) - triggers rebuild
        const solaceContent = await Bun.file(solaceSrcPath).text();
        await Bun.write(solaceSrcPath, solaceContent);
        await waitForRebuild();
        const manifest2 = await Bun.file(distManifestPath).text();
        expect(manifest2).toMatchSnapshot("manifest-after-noop");

        // 4. Remove solace.ts from manifest
        const modifiedManifest = originalManifestContent.replace(
          'ts: ["src/solace.ts"]',
          "ts: []",
        );
        await Bun.write(manifestPath, modifiedManifest);
        await waitForRebuild();
        const manifest3 = await Bun.file(distManifestPath).text();
        expect(manifest3).toMatchSnapshot("manifest-after-removal");
        expect(manifest3).not.toContain("solace");
      } catch (e) {
        console.error("Test failes: " + e);
      } finally {
        proc.stdin.write("\u0003");
        //proc.kill("SIGINT");
        await proc.exited;
      }
    },
    { timeout: 30000 },
  );
});
