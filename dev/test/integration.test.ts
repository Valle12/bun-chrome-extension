import type { Subprocess } from "bun";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { readdir, rm, writeFile } from "fs/promises";
import { resolve } from "path";

const testDir = resolve(import.meta.dir, "resources/bceIntegration");
const testDistDir = resolve(testDir, "dist");
const manifestPath = resolve(testDir, "manifest.ts");
const solacePath = resolve(testDir, "src/solace.ts");
const bcePath = resolve(import.meta.dir, "../bce.ts");

// Store original file contents for restoration
let originalManifestContent: string;
let originalSolaceContent: string;

describe("integration: bce --dev", () => {
  let bceProcess: Subprocess;
  let ws: WebSocket;
  let reloadCount = 0;
  let wsServerReady = false;

  // Increase timeout for beforeAll as it starts a server and waits for connections
  beforeAll(async () => {
    // Store original file contents
    originalManifestContent = await Bun.file(manifestPath).text();
    originalSolaceContent = await Bun.file(solacePath).text();

    // Clean up any previous dist folder
    await rm(testDistDir, { recursive: true, force: true });

    // Start the bce --dev process with IPC to know when websocket is ready
    let ipcResolved = false;
    const serverReadyPromise = new Promise<void>(resolve => {
      bceProcess = Bun.spawn(["bun", "run", bcePath, "--dev"], {
        cwd: testDir,
        env: { ...process.env, LOCAL: "true" },
        stdout: "inherit",
        stderr: "inherit",
        ipc(message) {
          console.log("IPC message:", message);
          if (message === "websocket ready") {
            wsServerReady = true;
            ipcResolved = true;
            resolve();
          }
        },
      });
    });

    // Wait for the websocket server to be ready via IPC or polling
    // Use a combined approach: race IPC with polling, but don't throw on poll timeout
    const pollForServer = async () => {
      const timeout = 25000;
      const startTime = Date.now();
      while (Date.now() - startTime < timeout) {
        if (ipcResolved) return; // IPC already resolved
        try {
          await fetch("http://localhost:8080", { mode: "no-cors" });
          return; // Server is ready
        } catch {
          await Bun.sleep(250);
        }
      }
      // If we get here, neither IPC nor polling worked
      throw new Error("Server did not start in time");
    };

    await Promise.race([serverReadyPromise, pollForServer()]);

    // Connect WebSocket
    ws = new WebSocket("ws://localhost:8080");

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("WebSocket connection timeout")),
        5000,
      );
      ws.onopen = () => {
        clearTimeout(timeout);
        resolve();
      };
      ws.onerror = err => {
        clearTimeout(timeout);
        reject(err);
      };
    });

    ws.onmessage = event => {
      if (event.data === "reload") {
        reloadCount++;
        console.log(`Reload #${reloadCount} received`);
      }
    };

    // Wait for initial reload on connection
    await waitForReload(1);
  }, 30000);

  afterAll(async () => {
    // Close WebSocket
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }

    // Kill the bce process
    if (bceProcess) {
      // bceProcess.kill() may not work on all platforms (e.g., GitHub Actions Ubuntu)
      // Try multiple approaches to ensure the process is terminated
      if (typeof bceProcess.kill === "function") {
        try {
          bceProcess.kill();
        } catch {
          // Fallback: kill by PID if available
          if (bceProcess.pid) {
            try {
              process.kill(bceProcess.pid, "SIGTERM");
            } catch {
              // Process may already be dead
            }
          }
        }
      } else if (bceProcess.pid) {
        try {
          process.kill(bceProcess.pid, "SIGTERM");
        } catch {
          // Process may already be dead
        }
      }
    }

    // Restore original file contents
    await writeFile(manifestPath, originalManifestContent);
    await writeFile(solacePath, originalSolaceContent);

    // Clean up dist folder
    await rm(testDistDir, { recursive: true, force: true });
  }, 30000);

  test("should have initial build with solace.js in dist", async () => {
    // Wait a bit for initial build to complete
    await Bun.sleep(500);

    const distFiles = await readdir(testDistDir, { recursive: true });
    const distFilesList = distFiles.map(f => f.toString());

    expect(distFilesList).toContain("manifest.json");
    // compose.js is the generated service worker that imports the original background.ts
    expect(distFilesList).toContain("compose.js");
    expect(distFilesList.some(f => f.includes("solace.js"))).toBe(true);
  });

  test("should trigger reload when saving solace.ts without changes", async () => {
    const initialReloadCount = reloadCount;

    // Touch the file (save without changes)
    const content = await Bun.file(solacePath).text();
    await writeFile(solacePath, content);

    // Wait for reload
    await waitForReload(initialReloadCount + 1);

    expect(reloadCount).toBe(initialReloadCount + 1);

    // Verify dist still has solace.js
    const distFiles = await readdir(testDistDir, { recursive: true });
    expect(distFiles.some(f => f.toString().includes("solace.js"))).toBe(true);
  });

  test("should rebuild without solace when removed from manifest", async () => {
    const initialReloadCount = reloadCount;

    // Update manifest to remove solace.ts from content_scripts
    const newManifestContent = `import { defineManifest } from "../../../types";

export const manifest = defineManifest({
  name: "Test",
  version: "0.0.1",
  background: {
    service_worker: "src/background.ts",
  },
  // content_scripts removed - no solace.ts reference
});
`;
    await writeFile(manifestPath, newManifestContent);

    // Wait for rebuild
    await waitForReload(initialReloadCount + 1);

    expect(reloadCount).toBe(initialReloadCount + 1);

    // Read the manifest.json to verify solace is no longer referenced
    const manifestJsonPath = resolve(testDistDir, "manifest.json");
    const manifestJson = await Bun.file(manifestJsonPath).json();

    // The built manifest should not have content_scripts anymore
    expect(manifestJson.name).toBe("Test");
    expect(manifestJson.background?.service_worker).toBe("compose.js");
    expect(manifestJson.content_scripts).toBeUndefined();
  });

  async function waitForReload(expectedCount: number, timeout = 15000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (reloadCount >= expectedCount) {
        return;
      }
      await Bun.sleep(50);
    }
    throw new Error(
      `Timeout waiting for reload. Expected ${expectedCount}, got ${reloadCount}`,
    );
  }
});
