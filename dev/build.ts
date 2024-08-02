import { resolve } from "path";
import { FullManifest } from "./types";

export class Build {
  async parseManifest(manifest: FullManifest) {
    const dist = resolve(process.cwd(), "dist");
    await Bun.write(dist, JSON.stringify(manifest, null, 2));

    await Bun.build({
      entrypoints: this.getPaths(manifest),
      minify: true,
      outdir: dist,
      sourcemap: "linked",
    });
  }

  getPaths(manifest: FullManifest) {
    const paths: string[] = [];
    if (manifest["background"])
      paths.push(manifest["background"]["service_worker"]);
    return paths;
  }
}
