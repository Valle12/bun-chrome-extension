#!/usr/bin/env bun
import { exists, rm } from "fs/promises";
import { resolve } from "path";
import { Build } from "./build";
import type { BCEConfig, FullManifest } from "./types";

export class BCE {
  constructor() {}

  async init() {
    await rm(resolve(process.cwd(), "dist"), { recursive: true, force: true });

    const configFile = resolve(process.cwd(), "bce.config.ts");
    let config: BCEConfig | undefined;
    if (await exists(configFile)) {
      const configModule = await import(configFile);
      config = configModule.default;
    }

    const manifestModule = await import(resolve(process.cwd(), "manifest.ts"));
    const manifest: FullManifest = manifestModule.manifest;
    const build = new Build(manifest, config);
    await build.parse();
    console.log("Build completed!");
  }
}

if (import.meta.path === Bun.main) {
  const bce = new BCE();
  bce.init();
}
