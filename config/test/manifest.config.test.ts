import { describe, expect, test } from "bun:test";
import { defineManifest } from "../manifest.config";

describe("manifest.config.ts", () => {
  test("correctly setup manifest", () => {
    const manifest = defineManifest({
      name: "test",
      version: "0.0.1",
    });

    expect(manifest["manifest_version"]).toBe(3);
    expect(manifest["name"]).toBe("test");
    expect(manifest["version"]).toBe("0.0.1");
  });
});
