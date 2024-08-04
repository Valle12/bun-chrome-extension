await Bun.build({
  entrypoints: ["index.ts"],
  outdir: "dist",
  target: "node",
  sourcemap: "linked",
  minify: true,
});
