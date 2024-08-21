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
    const dist = resolve(import.meta.dir, "..", "dist");
    const manifest = resolve(import.meta.dir, "resources/manifest.ts");
    spyOn(await import("path"), "resolve").mockImplementation((...args) => {
      if (args.includes("manifest.ts")) return manifest;
      return dist;
    });

    const bce = new BCE();
    await bce.init();

    expect(Build).toHaveBeenCalledTimes(1);
    expect(Build).toHaveBeenCalledWith(
      {
        manifest_version: 3,
        name: "Test",
        version: "0.0.1",
      },
      undefined
    );
  });

  test("test if config will be read with manifest", async () => {
    const dist = resolve(import.meta.dir, "..", "dist");
    const manifest = resolve(import.meta.dir, "resources/manifest.ts");
    const config = resolve(import.meta.dir, "resources/bce.config.ts");
    spyOn(await import("path"), "resolve").mockImplementation((...args) => {
      if (args.includes("manifest.ts")) return manifest;
      if (args.includes("bce.config.ts")) return config;
      return dist;
    });

    const bce = new BCE();
    await bce.init();

    expect(Build).toHaveBeenCalledTimes(1);
    expect(Build).toHaveBeenCalledWith(
      {
        manifest_version: 3,
        name: "Test",
        version: "0.0.1",
      },
      {
        minify: false,
        sourcemap: "linked",
        outdir: "dist",
        public: "public",
      }
    );
  });
});
