import type { ServerWebSocket } from "bun";
import { watch } from "fs";
import { extname, relative, resolve } from "path";
import { posix } from "path/posix";
import { exportRemover } from "./plugins";
import type { BCEConfig, FullManifest, WebSocketType } from "./types";

export class Build {
  manifest: FullManifest;
  config: Required<BCEConfig>;
  ws!: ServerWebSocket<WebSocketType>;
  cwd = process.cwd();
  ignoreKeys = ["version"];
  icons = [".png", ".bmp", ".gif", ".ico", ".jpeg"];
  originalServiceWorker: string | undefined;
  compose = resolve(this.cwd, "compose.ts");
  firstConnect = true;

  constructor(manifest: FullManifest, config: BCEConfig = {}) {
    this.manifest = manifest;
    this.originalServiceWorker = this.manifest.background?.service_worker;

    const defaultConfig: Required<BCEConfig> = {
      minify: true,
      sourcemap: "none",
      outdir: resolve(this.cwd, "dist"),
    };

    this.config = {
      minify: config.minify ?? defaultConfig.minify,
      sourcemap: config.sourcemap ?? defaultConfig.sourcemap,
      outdir: resolve(config.outdir ?? defaultConfig.outdir),
    };
  }

  async setServiceWorker() {
    if (
      !this.manifest.background ||
      !(await Bun.file(
        resolve(this.cwd, this.originalServiceWorker as string)
      ).exists())
    ) {
      console.log("No background service worker found, creating one...");
      let composeContent = await Bun.file(
        resolve(import.meta.dir, "composeTemplate.ts")
      ).text();
      composeContent = composeContent.replaceAll(
        "./connection",
        "bun-chrome-extension-dev/connection"
      );
      composeContent = composeContent.replaceAll(
        "./keepAlive",
        "bun-chrome-extension-dev/keepAlive"
      );
      await Bun.write(this.compose, composeContent);
      this.manifest.background = {
        service_worker: this.compose,
        type: "module",
      };
    } else {
      console.log("Background service worker found, creating compose...");
      let composeContent = await Bun.file(
        resolve(import.meta.dir, "composeTemplate.ts")
      ).text();
      composeContent = composeContent.replaceAll(
        "./connection",
        "bun-chrome-extension-dev/connection"
      );
      composeContent = composeContent.replaceAll(
        "./keepAlive",
        "bun-chrome-extension-dev/keepAlive"
      );
      composeContent = composeContent.replaceAll(
        "// IMPORT // Do not remove!",
        `import "${this.posixPath(
          resolve(this.cwd, this.originalServiceWorker as string)
        )}";`
      );
      await Bun.write(this.compose, composeContent);
      this.manifest.background = {
        service_worker: this.compose,
        type: "module",
      };
    }
  }

  openWebsocket(ws: ServerWebSocket<WebSocketType>) {
    this.ws = ws;

    if (this.firstConnect) {
      this.firstConnect = false;
      this.ws.send("reload");
    }

    console.log("Connection established!");
  }

  startServer() {
    Bun.serve<WebSocketType>({
      fetch(req, server) {
        if (server.upgrade(req)) return;
        return new Response("Upgrade failed!", { status: 500 });
      },
      websocket: {
        open: ws => this.openWebsocket(ws),
        message: () => {},
      },
    });
  }

  async initDev() {
    await this.setServiceWorker();
    this.startServer();

    let timeout: Timer;
    const watcher = watch(this.cwd, { recursive: true }, (_event, filename) => {
      if (
        filename === null ||
        resolve(this.cwd, filename).includes(this.config.outdir) ||
        filename.includes("node_modules")
      )
        return;
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(async () => {
        console.clear();
        console.log("Rebuild project...");
        await this.setServiceWorker();
        await this.parse();
        this.ws.send("reload");
      }, 50);
    });

    process.on("SIGINT", () => {
      console.log("Closing watcher...");
      watcher.close();
      process.exit();
    });
  }

  async parse() {
    await this.parseManifest();
    await this.writeManifest();
  }

  async parseManifest() {
    if (this.manifest.background) this.manifest.background.type = "module";
    const entrypoints: string[] = [];
    this.extractPaths(entrypoints);

    if (entrypoints.length !== 0) {
      const result = await Bun.build({
        entrypoints: [...entrypoints],
        minify: this.config.minify,
        outdir: this.config.outdir,
        sourcemap: this.config.sourcemap,
        plugins: [exportRemover],
      });

      let manifestJson = JSON.stringify(this.manifest, (_key, value) => {
        if (typeof value === "string") return this.posixPath(value);
        return value;
      });

      for (const output of result.outputs) {
        if (
          (output.path.endsWith(".js") &&
            output.loader === "html" &&
            output.kind === "entry-point") ||
          (output.path.endsWith(".css") &&
            output.loader === "html" &&
            output.kind === "asset") ||
          (output.path.endsWith(".js") &&
            output.loader === "file" &&
            output.kind === "entry-point")
        ) {
          continue;
        }

        let pathInOutdir = this.relativePosixPath(
          this.config.outdir,
          output.path
        );

        if (this.icons.includes(extname(pathInOutdir))) {
          const pathInOutdirParts = pathInOutdir.split("-");
          pathInOutdirParts.pop();
          pathInOutdir = pathInOutdirParts.join("") + extname(pathInOutdir);
        }

        const entrypointIndex = entrypoints.findIndex(entry => {
          entry = entry.replaceAll(".ts", ".js");
          return entry.includes(posix.sep + pathInOutdir);
        });

        if (entrypointIndex === -1) {
          console.error(
            "Could not find entrypoint for output",
            entrypoints,
            output
          );
          continue;
        }

        const entrypoint = entrypoints[entrypointIndex];
        entrypoints.splice(entrypointIndex, 1);

        manifestJson = manifestJson.replaceAll(
          entrypoint,
          this.relativePosixPath(this.config.outdir, output.path)
        );
      }
      this.manifest = JSON.parse(manifestJson);
    }
  }

  async writeManifest() {
    const file = resolve(this.config.outdir, "manifest.json");
    const content = JSON.stringify(this.manifest, null, 2);
    await Bun.write(file, content);
  }

  extractPaths(
    paths: string[] = [],
    currentPath = "",
    obj: any = this.manifest
  ) {
    for (let [key, value] of Object.entries(obj)) {
      const prefix = currentPath === "" ? "" : ".";
      if (typeof value === "object") {
        if (key === "ts") {
          key = "js";
          obj[key] = value;
          delete obj.ts;
        }

        this.extractPaths(paths, currentPath + prefix + key, value);
      } else if (
        typeof value === "string" &&
        extname(value) &&
        !this.ignoreKeys.includes(key)
      ) {
        const resolvedKey = this.posixPath(resolve(value));
        obj[key] = resolvedKey;
        paths.push(resolvedKey);
      }
    }
  }

  relativePosixPath(from: string, to: string) {
    return this.posixPath(relative(from, to));
  }

  posixPath(path: string) {
    return path.replaceAll(/\\/g, "/").replaceAll("//", "/");
  }
}
