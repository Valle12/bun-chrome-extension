import { afterEach, beforeEach, describe, expect, test } from "bun:test";
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
  const srcManifestPath = resolve(cwd, "manifest.ts");
  const srcSolacePath = resolve(cwd, "src/solace.ts");
  const distManifestPath = resolve(dist, "manifest.json");
  const distSolacePath = resolve(dist, "src/solace.js");

  beforeEach(async () => {
    originalManifestContent = await Bun.file(srcManifestPath).text();
    await rm(dist, { recursive: true, force: true });
    await rm(run, { recursive: true, force: true });
  });

  afterEach(async () => {
    await Bun.write(srcManifestPath, originalManifestContent);
    await rm(dist, { recursive: true, force: true });
    await rm(run, { recursive: true, force: true });
  });

  test(
    "dev server watches for changes and rebuilds correctly",
    async () => {
      expect.assertions(5);

      await build(run);

      let counter = 0;
      const proc = Bun.spawn(["bun", resolve(run, "bce.js"), "--dev"], {
        cwd,
        env: { ...process.env, LOCAL: "true" },
        stdout: "inherit",
        stderr: "inherit",
        stdin: "pipe",
        async ipc(message: IPCMessage) {
          if (message === "rebuild complete") {
            if (counter == 1) {
              counter++;
              new Connection().connect();

              const manifestFile = Bun.file(distManifestPath);
              const manifestContent = await manifestFile.text();
              expect(manifestContent).toMatchSnapshot();

              const distSolaceFile = Bun.file(distSolacePath);
              const distSolaceContent = await distSolaceFile.text();
              expect(distSolaceContent).toMatchSnapshot();

              const srcManifestFile = Bun.file(srcManifestPath);
              const srcManifestContent = (
                await srcManifestFile.text()
              ).replaceAll('ts: ["src/solace.ts"]', "ts: []");
              await Bun.write(srcManifestFile, srcManifestContent);
            } else if (counter === 2) {
              counter++;
              new Connection().connect();

              const manifestFile = Bun.file(distManifestPath);
              const manifestContent = await manifestFile.text();
              expect(manifestContent).toMatchSnapshot();

              if (proc.kill) proc.kill("SIGINT"); // I have no idea why that is needed for ubuntu
            }
          } else if (message === "websocket ready") {
            counter++;
            new Connection().connect();

            const manifestFile = Bun.file(distManifestPath);
            const manifestContent = await manifestFile.text();
            expect(manifestContent).toMatchSnapshot();

            const distSolaceFile = Bun.file(distSolacePath);
            const distSolaceContent = await distSolaceFile.text();
            expect(distSolaceContent).toMatchSnapshot();

            const srcSolaceFile = Bun.file(srcSolacePath);
            const srcSolaceContent = await srcSolaceFile.text();
            await Bun.write(srcSolaceFile, srcSolaceContent);
          }
        },
      });

      await proc.exited;
    },
    { timeout: 20000, retry: 4 },
  );
});
