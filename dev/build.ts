import { extname, relative, resolve } from "path";
import { posix } from "path/posix";
import type { BCEConfig, FullManifest } from "./types";

export class Build {
  manifest: FullManifest;
  config: Required<BCEConfig>;
  cwd = process.cwd();
  ignoreKeys = ["version"];
  icons = [".png", ".bmp", ".gif", ".ico", ".jpeg"];

  constructor(manifest: FullManifest, config: BCEConfig = {}) {
    this.manifest = manifest;

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

  async parse() {
    await this.parseManifest();
    await this.writeManifest();
  }

  async parseManifest() {
    const entrypoints = this.extractPaths();

    if (entrypoints.length !== 0) {
      const result = await Bun.build({
        entrypoints,
        minify: this.config.minify,
        outdir: this.config.outdir,
        naming: "[dir]/[name].[ext]",
      });

      let manifestJson = JSON.stringify(this.manifest, (_key, value) => {
        if (typeof value === "string") {
          return this.posixPath(value);
        }

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

        let pathInOutdir = relative(this.config.outdir, output.path);

        if (this.icons.includes(extname(pathInOutdir))) {
          const pathInOutdirParts = pathInOutdir.split("-");
          pathInOutdirParts.pop();
          pathInOutdir = pathInOutdirParts.join("") + extname(pathInOutdir);
        }

        // TODO remove entrypoints from the array, after they have been used
        const entrypoint = entrypoints.find(entry => {
          entry = entry.replaceAll(".ts", ".js");
          return entry.includes(posix.sep + pathInOutdir);
        });

        if (entrypoint === undefined) {
          console.error(
            "Could not find entrypoint for output",
            entrypoints,
            output
          );
          continue;
        }

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

  extractPathsRecursive(
    paths: string[] = [],
    currentPath = "",
    obj: any = this.manifest
  ) {
    for (let [key, value] of Object.entries(obj)) {
      const prefix = currentPath === "" ? "" : ".";
      if (typeof value === "object") {
        if (typeof key === "string" && key === "ts") {
          key = "js";
          obj[key] = value;
          delete obj.ts;
        }

        this.extractPathsRecursive(paths, currentPath + prefix + key, value);
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

  extractPaths() {
    const paths: string[] = [];
    this.extractPathsRecursive(paths);
    return paths;
  }

  relativePosixPath(from: string, to: string) {
    return this.posixPath(relative(from, to));
  }

  posixPath(path: string) {
    return path.replaceAll(/\\/g, "/").replaceAll("//", "/");
  }
}
