import type { BunPlugin } from "bun";
import { compile } from "sass";
import type { BCEConfig } from "./types";

export const exportRemover: BunPlugin = {
  name: "exportRemover",
  setup(build) {
    const regex = createTsEntrypointsRegex(build.config.entrypoints);

    build.onLoad({ filter: regex }, async args => {
      const content = await Bun.file(args.path).text();
      const transformed = content.replace(/\bexport(?:\s+default)?\s+/g, "");
      return {
        contents: transformed,
      };
    });
  },
};

export const sassCompiler = (config: Required<BCEConfig>): BunPlugin => ({
  name: "sassCompiler",
  setup(build) {
    build.onLoad({ filter: /\.scss$/ }, args => {
      const result = compile(args.path, {
        silenceDeprecations: config.silenceDeprecations,
      });
      return {
        contents: result.css,
        loader: "css",
      };
    });
  },
});

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createTsEntrypointsRegex(entrypoints: string[]) {
  const isWindows = process.platform === "win32";
  const tsEntrypoints = entrypoints.filter(entry => entry.endsWith(".ts"));
  if (tsEntrypoints.length === 0) return /^(?!)$/;
  const escapedEntryPoints = tsEntrypoints.map(escapeRegex);
  let pattern = `^(?:${escapedEntryPoints.join("|")})$`;
  if (isWindows) pattern = pattern.replace(/\//g, "\\\\");
  return new RegExp(pattern);
}
