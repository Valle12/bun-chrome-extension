import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { watch, type FSWatcher } from "chokidar";
import { rm } from "fs/promises";
import { resolve } from "path";
import { build } from "../packager";
import { Connection } from "./resources/bceIntegration/connection";

async function waitForFile(
  filePath: string,
  timeout = 10000,
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await Bun.file(filePath).exists()) return true;
    await Bun.sleep(100);
  }
  return false;
}

async function waitForServer(port: number, timeout = 10000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const ws = new WebSocket(`ws://localhost:${port}`);
      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => {
          ws.close();
          resolve();
        };
        ws.onerror = reject;
      });
      return true;
    } catch {
      await Bun.sleep(100);
    }
  }
  return false;
}

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

  test(
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

      const serverReady = await waitForServer(8080);
      if (!serverReady) {
        throw new Error("Server did not start in time");
      }

      const manifestExists = await waitForFile(resolve(dist, "manifest.json"));
      if (!manifestExists) {
        throw new Error("Initial manifest.json was not created");
      }

      // Use a sequential processing queue to avoid race conditions
      let distManifestCounter = 0;
      let distWatcher: FSWatcher | null = null;

      // Mutex to process events one at a time
      let processingLock = Promise.resolve();

      await new Promise<void>((resolveTest, rejectTest) => {
        const cleanup = () => {
          distWatcher?.close();
        };

        const testTimeout = setTimeout(() => {
          cleanup();
          rejectTest(
            new Error(
              `Test timed out. distManifestCounter=${distManifestCounter}`,
            ),
          );
        }, 18000);

        distWatcher = watch(dist, {
          awaitWriteFinish: {
            stabilityThreshold: 300,
            pollInterval: 50,
          },
          ignoreInitial: true,
        });

        distWatcher.on("all", async (_event, filename) => {
          if (!filename.endsWith("manifest.json")) return;

          processingLock = processingLock.then(async () => {
            distManifestCounter++;
            const currentCounter = distManifestCounter;

            try {
              // Wait a bit for all files to be written
              await Bun.sleep(100);

              new Connection().connect();

              const manifest = await Bun.file(
                resolve(dist, "manifest.json"),
              ).text();
              expect(manifest).toMatchSnapshot();

              const solaceDistPath = resolve(dist, "src/solace.js");
              expect(await Bun.file(solaceDistPath).exists()).toBeTrue();

              if (currentCounter <= 2) {
                const solaceDist = await Bun.file(solaceDistPath).text();
                expect(solaceDist).not.toContain("export");
                expect(solaceDist).toMatchSnapshot();
              }

              if (currentCounter === 1) {
                await Bun.sleep(200);
                const solace = Bun.file(resolve(cwd, "src/solace.ts"));
                const content = await solace.text();
                await Bun.write(solace, content);
              } else if (currentCounter === 2) {
                await Bun.sleep(200);
                const content = originalManifestContent.replaceAll(
                  'ts: ["src/solace.ts"]',
                  "ts: []",
                );
                await Bun.write(manifestPath, content);
              } else if (currentCounter === 3) {
                cleanup();
                clearTimeout(testTimeout);
                proc.stdin.write("\u0003"); // Simulate CTRL + C
                resolveTest();
              }
            } catch (err) {
              cleanup();
              clearTimeout(testTimeout);
              rejectTest(err);
            }
          });
        });

        (async () => {
          await Bun.sleep(500); // Give watcher time to initialize
          const solace = Bun.file(resolve(cwd, "src/solace.ts"));
          const content = await solace.text();
          await Bun.write(solace, content);
        })();
      });

      await proc.exited;
    },
    {
      timeout: 25000,
      retry: 3,
    },
  );
});
