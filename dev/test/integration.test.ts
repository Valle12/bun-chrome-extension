import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { watch } from "chokidar";
import { rm } from "fs/promises";
import { resolve } from "path";
import { Connection } from "./resources/bceIntegration/connection";

describe("bce integration", () => {
  let originalManifestContent: string;
  const cwd = resolve(import.meta.dir, "resources/bceIntegration");
  const manifestPath = resolve(cwd, "manifest.ts");

  beforeEach(async () => {
    originalManifestContent = await Bun.file(manifestPath).text();
    await rm(resolve(cwd, "dist"), { recursive: true, force: true });
  });

  afterEach(async () => {
    await Bun.write(manifestPath, originalManifestContent);
    await rm(resolve(cwd, "dist"), { recursive: true, force: true });
  });

  test("test if watching and reloading works as expected", async () => {
    expect.assertions(12);

    const proc = Bun.spawn({
      cmd: ["bun", "./../../../bce.ts", "--dev"],
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

      const manifest = await Bun.file(
        resolve(cwd, "dist/manifest.json")
      ).text();
      expect(manifest).toMatchSnapshot();

      const solaceDist = await Bun.file(
        resolve(cwd, "dist/src/solace.js")
      ).text();
      expect(solaceDist).not.toContain("export");
      expect(solaceDist).toMatchSnapshot();

      if (counter === 1) {
        const solace = Bun.file(resolve(cwd, "src/solace.ts"));
        const content = await solace.text();
        await Bun.write(solace, content);
      } else if (counter === 2) {
        const content = originalManifestContent.replaceAll(
          'ts: ["src/solace.ts"]',
          "ts: []"
        );
        await Bun.write(manifestPath, content);
      } else if (counter === 3) {
        watcher.close();
      }
    });

    const distWatcher = watch(resolve(cwd, "dist"), {
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 10,
      },
      ignoreInitial: true,
    });

    let manifestCounter = 0;
    distWatcher.on("all", async (_event, filename) => {
      if (!filename.endsWith("manifest.json")) return;
      // The third time solace.js is not in manifest.json, but dist still contains unused files until process restarted
      expect(
        await Bun.file(resolve(cwd, "dist/src/solace.js")).exists()
      ).toBeTrue();
      manifestCounter++;
      if (manifestCounter === 3) {
        distWatcher.close();
        proc.stdin.write("\u0003"); // Simulate CTRL + C
      }
    });

    await proc.exited;
  });
});
