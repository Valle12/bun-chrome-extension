import { defineConfig } from "../../types";

export default defineConfig({
  minify: false,
  sourcemap: "linked",
  outdir: "dist",
  public: "public",
});
