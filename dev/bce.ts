#!/usr/bin/env bun
import { rm } from "fs/promises";
import { resolve } from "path";
import { Build } from "./build";
import type { BCEConfig, FullManifest } from "./types";

export { defineManifest } from "./types";

await rm(resolve(process.cwd(), "dist"), { recursive: true, force: true });

const configFile = resolve(process.cwd(), "bce.config.ts");
let config: BCEConfig | undefined;
if (await Bun.file(configFile).exists()) {
  const configModule = await import(configFile);
  config = configModule.default;
}

const manifestModule = await import(resolve(process.cwd(), "manifest.ts"));
const manifest: FullManifest = manifestModule.manifest;

const build = new Build(manifest, config);
if (process.argv.length === 3 && process.argv[2] === "--dev")
  await build.initDev();
await build.parse();

console.log("Build completed!");
