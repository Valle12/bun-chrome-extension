import { describe, expect, test } from "bun:test";
import { manifest } from "../manifest";

describe("manifest.ts", () => {
  test("test if manifest is setup correctly", () => {
    expect(manifest["manifest_version"]).toBe(3);
    expect(manifest["name"]).toBe("bun-project-const");
    expect(manifest["version"]).toBe("0.0.1");
  });
});
