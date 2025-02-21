import type { BunPlugin } from "bun";
import { compile } from "sass";

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

export const sassCompiler: BunPlugin = {
  name: "sassCompiler",
  setup(build) {
    build.onLoad({ filter: /\.scss$/ }, args => {
      const result = compile(args.path);
      return {
        contents: result.css,
        loader: "css",
      };
    });
  },
};

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
