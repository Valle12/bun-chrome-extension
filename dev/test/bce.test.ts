import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";
import { resolve } from "path";
import { BCE } from "../bce";
import { Build } from "../build";

describe("init", async () => {
  const original = {
    ...(await import("../build")),
  };

  beforeEach(async () => {
    const resources = resolve(import.meta.dir, "resources/manifest.ts");
    const dist = resolve(import.meta.dir, "..", "dist");
    spyOn(await import("path"), "resolve").mockImplementation((...args) => {
      if (args.includes("manifest.ts")) return resources;
      return dist;
    });
    await mock.module("../build", () => {
      return {
        Build: mock(() => {
          return {
            parse: mock(),
          };
        }),
      };
    });
  });

  afterEach(async () => {
    mock.restore();
    await mock.module("../build", () => original);
  });

  test("test if basic manifest will be read", async () => {
    const bce = new BCE();
    await bce.init();

    expect(Build).toHaveBeenCalledTimes(1);
    expect(Build).toHaveBeenCalledWith({
      manifest_version: 3,
      name: "Test",
      version: "0.0.1",
    });
  });
});
