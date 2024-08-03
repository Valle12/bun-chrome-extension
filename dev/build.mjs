await Bun.build({
  entrypoints: ["index.ts"],
  outdir: "dist",
  target: "bun",
  sourcemap: "linked",
  minify: true,
});
