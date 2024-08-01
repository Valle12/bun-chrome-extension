import type { FullManifest, Manifest } from "./types";

export function defineManifest(manifest: Manifest): FullManifest {
  return {
    manifest_version: 3,
    ...manifest,
  };
}
