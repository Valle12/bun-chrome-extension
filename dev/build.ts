import { rm } from "fs/promises";
import { resolve } from "path";
import { FullManifest } from "./types";

export class Build {
  dist = resolve(process.cwd(), "dist");

  async parseManifest(manifest: FullManifest) {
    await rm(this.dist, { recursive: true });

    const properties: { [key: string]: boolean } = {};
    const entrypoints = this.extractPaths(manifest, properties);
    if (entrypoints.length !== 0) {
      const result = await Bun.build({
        entrypoints,
        minify: true,
        outdir: this.dist,
      });

      const length = result.outputs.length;
      for (let i = 0; i < length; i++) {
        if (properties.background && manifest.background) {
          const file = result.outputs[0];
          result.outputs.shift();
          manifest.background.service_worker = file.path;
          properties.background = false;
          continue;
        }

        if (properties.content_scripts && manifest.content_scripts) {
          const contentScripts = manifest.content_scripts;
          for (const contentScript of contentScripts) {
            if (!contentScript.ts) continue;
            for (let j = 0; j < contentScript.ts.length; j++) {
              const file = result.outputs[0];
              result.outputs.shift();
              contentScript.ts[j] = file.path;
            }
          }
          properties.content_scripts = false;
          continue;
        }
      }
    }

    const manifestFile = resolve(this.dist, "manifest.json");
    const manifestContent = JSON.stringify(manifest, null, 2).replace(
      `"ts"`,
      `"js"`
    );
    await Bun.write(manifestFile, manifestContent);
  }

  extractPaths(manifest: FullManifest, properties: { [key: string]: boolean }) {
    const paths: string[] = [];

    if (manifest.background) {
      paths.push(resolve(manifest.background.service_worker));
      properties.background = true;
    }

    if (manifest.content_scripts) {
      for (const contentScript of manifest.content_scripts) {
        if (!contentScript.ts) continue;
        for (const ts of contentScript.ts) {
          paths.push(resolve(ts));
        }
      }
      properties.content_scripts = true;
    }

    return paths;
  }
}
