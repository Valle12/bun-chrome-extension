await Bun.build({
  entrypoints: ["bce.ts"],
  //minify: true,
  target: "bun",
  outdir: "dist",
});
export {};
