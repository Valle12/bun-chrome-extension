import { resolve } from "path";

export async function build(outdir = "dist") {
  await Bun.build({
    entrypoints: [
      resolve(import.meta.dir, "bce.ts"),
      resolve(import.meta.dir, "composeTemplate.ts"),
    ],
    outdir,
    target: "bun",
    minify: true,
    external: ["sass", "chokidar"],
    banner: "// IMPORT // Do not remove!",
  });
}

await build();
