import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import { watch } from "chokidar";
import { rm } from "fs/promises";
import { resolve } from "path";
import { Connection } from "./resources/bceIntegration/connection";

describe("bce integration", () => {
  const cwd = resolve(import.meta.dir, "resources/bceIntegration");

  beforeAll(async () => {
    await rm(resolve(cwd, "dist"), { recursive: true, force: true });
  });

  afterEach(async () => {
    await rm(resolve(cwd, "dist"), { recursive: true, force: true });
  });

  test("test if watching and reloading works as expected", async () => {
    const proc = Bun.spawn({
      cmd: ["bun", "./../../../bce.ts", "--dev"],
      cwd,
      env: { ...process.env, LOCAL: "true" },
      stdout: "ignore",
      stderr: "ignore",
    });

    const watcher = watch(cwd, {
      awaitWriteFinish: {
        stabilityThreshold: 1000,
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
        watcher.close();
        proc.kill("SIGINT");
      }
    });

    await proc.exited;
  });
});
