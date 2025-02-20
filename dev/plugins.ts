import type { BunPlugin } from "bun";

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
