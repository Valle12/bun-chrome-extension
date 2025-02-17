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
import { BCE, main } from "../bce";
import { Build } from "../build";

describe("init", async () => {
  const originalBuild = {
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
    await mock.module("../build", () => originalBuild);
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
    await mockResolve();

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
      }
    );
  });

  test("test if init will be called, when main is called", async () => {
    Bun.env.TEST = "false";
    await mockResolve();
    spyOn(BCE.prototype, "init");
    spyOn(Bun, "file");

    await main();

    expect(BCE.prototype.init).toHaveBeenCalledTimes(1);
    expect(Bun.file).toHaveBeenCalledTimes(1);
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
      }
    );
  });
});

describe("bce.ts", () => {
  test("test if main will be called if file is executed", async () => {
    Bun.env.TEST = "true";

    const proc = Bun.spawn({
      cmd: ["bun", "bce.ts"],
      cwd: resolve(import.meta.dir, ".."),
    });
    const exitCode = await proc.exited;
    const text = await new Response(proc.stdout).text();

    expect(exitCode).toBe(0);
    expect(text).toBe("TEST\n");
  });
});

async function mockResolve() {
  const dist = resolve(import.meta.dir, "..", "dist");
  const manifest = resolve(import.meta.dir, "resources/manifest.ts");
  const config = resolve(import.meta.dir, "resources/bce.config.ts");
  spyOn(await import("path"), "resolve").mockImplementation((...args) => {
    if (args.includes("manifest.ts")) return manifest;
    if (args.includes("bce.config.ts")) return config;
    return dist;
  });
}
