#!/usr/bin/env bun
import { rm } from "fs/promises";
import { resolve } from "path";
import { Build } from "./build";
import type { FullManifest } from "./types";

export class BCE {
  constructor() {}

  async init() {
    await rm(resolve(process.cwd(), "dist"), { recursive: true });

    const resolved = resolve(process.cwd(), "manifest.ts");
    const manifestModule = await import(resolved);
    const manifest: FullManifest = manifestModule.manifest;
    const build = new Build(manifest);
    await build.parse();
    console.log("Build completed!");
  }
}

if (import.meta.path === Bun.main) {
  const bce = new BCE();
  bce.init();
}
