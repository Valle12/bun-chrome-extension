import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
  type Mock,
} from "bun:test";
import * as path from "path";
import { resolve } from "path";
import * as build from "../build";

describe("bce", async () => {
  const originalBuild = {
    ...build,
  };
  let buildMock = {} as Mock<(...args: any[]) => any>;
  let parseMock = {} as Mock<(...args: any[]) => any>;
  let initDevMock = {} as Mock<(...args: any[]) => any>;
  let startServerMock = {} as Mock<(...args: any[]) => any>;

  beforeEach(async () => {
    await mock.module("../build", () => {
      parseMock = mock();
      initDevMock = mock();
      startServerMock = mock();
      buildMock = mock(() => {
        return {
          parse: parseMock,
          initDev: initDevMock,
          startServer: startServerMock,
        };
      });
      return {
        Build: buildMock,
      };
    });
    spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(async () => {
    mock.restore();
    await mock.module("../build", () => originalBuild);
  });

  test("test with no config file", async () => {
    mockResolve();

    await import(`../bce?cacheBust=${Date.now()}${Math.random()}`);

    expect(buildMock).toHaveBeenCalledTimes(1);
    expect(buildMock).toHaveBeenCalledWith(
      {
        manifest_version: 3,
        name: "Test",
        version: "0.0.1",
      },
      undefined
    );
    expect(initDevMock).toHaveBeenCalledTimes(0);
    expect(parseMock).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith("Build completed!");
  });

  test("test with config file and --dev flag", async () => {
    process.argv.push("--dev");
    mockResolve("bce.config.ts");

    await import(`../bce?cacheBust=${Date.now()}${Math.random()}`);

    expect(buildMock).toHaveBeenCalledTimes(1);
    expect(buildMock).toHaveBeenCalledWith(
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
    expect(initDevMock).toHaveBeenCalledTimes(1);
    expect(parseMock).toHaveBeenCalledTimes(1);
    expect(startServerMock).toHaveBeenCalledTimes(1);

    process.argv.pop();
  });
});

function mockResolve(configFile = "invalid") {
  const dist = resolve(import.meta.dir, "..", "dist");
  const config = resolve(import.meta.dir, `resources/${configFile}`);
  const manifest = resolve(import.meta.dir, "resources/manifest.ts");
  spyOn(path, "resolve").mockImplementation((...args) => {
    if (args.includes("dist")) return dist;
    if (args.includes("bce.config.ts")) return config;
    return manifest;
  });
}
