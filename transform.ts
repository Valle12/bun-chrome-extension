await Bun.build({
  entrypoints: ["index.ts"],
  minify: true,
  outdir: "dist",
  target: "bun",
});
export {};
