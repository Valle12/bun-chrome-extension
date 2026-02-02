import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { watch } from "chokidar";
import { rm } from "fs/promises";
import { resolve } from "path";
import { build } from "../packager";
import { Connection } from "./resources/bceIntegration/connection";

describe("bce integration", () => {
  let originalManifestContent: string;
  const cwd = resolve(import.meta.dir, "resources/bceIntegration");
  const dist = resolve(cwd, "dist");
  const run = resolve(cwd, "run");
  const manifestPath = resolve(cwd, "manifest.ts");

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

  test.skipIf(!process.cwd().endsWith("dev"))(
    "test if watching and reloading works as expected",
    async () => {
      expect.assertions(10);

      await build(run);

      const proc = Bun.spawn({
        cmd: ["bun", resolve(run, "bce.js"), "--dev"],
        cwd,
        env: { ...process.env, LOCAL: "true" },
        stdout: "ignore",
        stderr: "ignore",
        stdin: "pipe",
      });

      const watcher = watch(cwd, {
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 10,
        },
        ignoreInitial: true,
      });

      let counter = 0;
      watcher.on("all", async (_event, filename) => {
        if (!filename.includes("manifest.json")) return;
        counter++;
        new Connection().connect();

        const manifest = await Bun.file(resolve(dist, "manifest.json")).text();
        expect(manifest).toMatchSnapshot();

        const solacePath = resolve(dist, "src/solace.js");
        if (await Bun.file(solacePath).exists()) {
          const solaceDist = await Bun.file(solacePath).text();
          expect(solaceDist).not.toContain("export");
          expect(solaceDist).toMatchSnapshot();
        }

        if (counter === 1) {
          const solace = Bun.file(resolve(cwd, "src/solace.ts"));
          const content = await solace.text();
          await Bun.write(solace, content);
        } else if (counter === 2) {
          const content = originalManifestContent.replaceAll(
            'ts: ["src/solace.ts"]',
            "ts: []",
          );
          await Bun.write(manifestPath, content);
        } else if (counter === 3) {
          watcher.close();
        }
      });

      const distWatcher = watch(dist, {
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 10,
        },
        ignoreInitial: true,
      });

      let manifestCounter = 0;
      distWatcher.on("all", async (_event, filename) => {
        if (!filename.endsWith("manifest.json")) return;
        manifestCounter++;
        const fileExists = await Bun.file(
          resolve(dist, "src/solace.js"),
        ).exists();
        if (manifestCounter === 3) {
          expect(fileExists).toBeFalse();
          distWatcher.close();
          proc.stdin.write("\u0003"); // Simulate CTRL + C
        } else {
          expect(fileExists).toBeTrue();
        }
      });

      await proc.exited;
    },
  );
});
