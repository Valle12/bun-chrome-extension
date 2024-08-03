import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  spyOn,
  test,
} from "bun:test";
import { resolve } from "path";
import { Build } from "../build";
import { defineManifest } from "../manifest.config";

let build: Build;
const cwd = resolve(import.meta.dir, "..");

describe("extractPaths", () => {
  beforeEach(() => {
    build = new Build();
    build.dist = resolve(cwd, "dist");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("test with no additional config", () => {
    const properties: { [key: string]: boolean } = {};
    const manifest = defineManifest({
      name: "test",
      version: "0.0.1",
    });

    const paths = build.extractPaths(manifest, properties);

    expect(properties).toEqual({});
    expect(paths.length).toBe(0);
  });

  test("test with background info", () => {
    const properties: { [key: string]: boolean } = {};
    const manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: "test.ts",
      },
    });

    const paths = build.extractPaths(manifest, properties);

    expect(properties.background).toBeTrue();
    expect(properties.content_scripts).toBeUndefined();
    expect(paths.length).toBe(1);
    expect(paths[0]).toBe(resolve("test.ts"));
  });

  test("test with content_scripts info", () => {
    const properties: { [key: string]: boolean } = {};
    const manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      content_scripts: [
        {
          ts: ["test.ts"],
        },
      ],
    });

    const paths = build.extractPaths(manifest, properties);

    expect(properties.background).toBeUndefined();
    expect(properties.content_scripts).toBeTrue();
    expect(paths.length).toBe(1);
    expect(paths[0]).toBe(resolve("test.ts"));
  });

  test("test with background and content_scripts info", () => {
    const properties: { [key: string]: boolean } = {};
    const manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: "src/test.ts",
      },
      content_scripts: [
        {
          ts: ["test.ts"],
        },
      ],
    });

    const paths = build.extractPaths(manifest, properties);

    expect(properties.background).toBeTrue();
    expect(properties.content_scripts).toBeTrue();
    expect(paths.length).toBe(2);
    expect(paths[0]).toBe(resolve("src/test.ts"));
    expect(paths[1]).toBe(resolve("test.ts"));
  });

  test("test with multiple ts files", () => {
    const properties: { [key: string]: boolean } = {};
    const manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      content_scripts: [
        {
          ts: ["test.ts", "src/test2.ts"],
        },
      ],
    });

    const paths = build.extractPaths(manifest, properties);

    expect(properties.background).toBeUndefined();
    expect(properties.content_scripts).toBeTrue();
    expect(paths.length).toBe(2);
    expect(paths[0]).toBe(resolve("test.ts"));
    expect(paths[1]).toBe(resolve("src/test2.ts"));
  });

  test("test with multiple content_scripts", () => {
    const properties: { [key: string]: boolean } = {};
    const manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      content_scripts: [
        {
          ts: ["test.ts"],
        },
        {
          ts: ["test2.ts"],
        },
      ],
    });

    const paths = build.extractPaths(manifest, properties);

    expect(properties.background).toBeUndefined();
    expect(properties.content_scripts).toBeTrue();
    expect(paths.length).toBe(2);
    expect(paths[0]).toBe(resolve("test.ts"));
    expect(paths[1]).toBe(resolve("test2.ts"));
  });

  test("test with everything", () => {
    const properties: { [key: string]: boolean } = {};
    const manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: "src/test.ts",
      },
      content_scripts: [
        {
          ts: ["test.ts"],
        },
        {
          ts: ["test2.ts", "test3.ts"],
        },
      ],
    });

    const paths = build.extractPaths(manifest, properties);

    expect(properties.background).toBeTrue();
    expect(properties.content_scripts).toBeTrue();
    expect(paths.length).toBe(4);
    expect(paths[0]).toBe(resolve("src/test.ts"));
    expect(paths[1]).toBe(resolve("test.ts"));
    expect(paths[2]).toBe(resolve("test2.ts"));
    expect(paths[3]).toBe(resolve("test3.ts"));
  });
});

describe("parseManifest", () => {
  beforeEach(() => {
    build = new Build();
    build.dist = resolve(cwd, "dist");
    spyOn(Bun, "build");
    spyOn(Bun, "write");
    spyOn(Array.prototype, "shift");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("test with no additional config", async () => {
    const manifest = defineManifest({
      name: "test",
      version: "0.0.1",
    });
    const manifestFile = resolve(build.dist, "manifest.json");

    await build.parseManifest(manifest);

    expect(Bun.build).not.toHaveBeenCalled();
    expect(Bun.write).toHaveBeenCalledWith(
      manifestFile,
      JSON.stringify(manifest, null, 2)
    );
    expect(Bun.write).toHaveBeenCalledTimes(1);
  });

  test("test with background info", async () => {
    const manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: resolve(cwd, "test/resources/test.ts"),
      },
    });
    const manifestFile = resolve(build.dist, "manifest.json");

    await build.parseManifest(manifest);

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.write).toHaveBeenCalledWith(
      manifestFile,
      JSON.stringify(manifest, null, 2)
    );
    expect(Bun.write).toHaveBeenCalledTimes(1);
    expect(Array.prototype.shift).toHaveBeenCalledTimes(1);
  });

  test("test with content_scripts info", async () => {
    const manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      content_scripts: [
        {
          ts: [resolve(cwd, "test/resources/test.ts")],
        },
      ],
    });
    const manifestFile = resolve(build.dist, "manifest.json");

    await build.parseManifest(manifest);

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.write).toHaveBeenCalledWith(
      manifestFile,
      JSON.stringify(manifest, null, 2).replace(`"ts"`, `"js"`)
    );
    expect(Bun.write).toHaveBeenCalledTimes(1);
    expect(Array.prototype.shift).toHaveBeenCalledTimes(1);
  });

  test("test with background and content_scripts info", async () => {
    const manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: resolve(cwd, "test/resources/test.ts"),
      },
      content_scripts: [
        {
          ts: [resolve(cwd, "test/resources/test2.ts")],
        },
      ],
    });
    const manifestFile = resolve(build.dist, "manifest.json");

    await build.parseManifest(manifest);

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.write).toHaveBeenCalledWith(
      manifestFile,
      JSON.stringify(manifest, null, 2).replace(`"ts"`, `"js"`)
    );
    expect(Bun.write).toHaveBeenCalledTimes(1);
    expect(Array.prototype.shift).toHaveBeenCalledTimes(2);
  });

  test("test with multiple ts files", async () => {
    const manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      content_scripts: [
        {
          ts: [
            resolve(cwd, "test/resources/test.ts"),
            resolve(cwd, "test/resources/test2.ts"),
          ],
        },
      ],
    });
    const manifestFile = resolve(build.dist, "manifest.json");

    await build.parseManifest(manifest);

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.write).toHaveBeenCalledWith(
      manifestFile,
      JSON.stringify(manifest, null, 2).replace(`"ts"`, `"js"`)
    );
    expect(Bun.write).toHaveBeenCalledTimes(1);
    expect(Array.prototype.shift).toHaveBeenCalledTimes(2);
  });

  test("test with multiple content_scripts", async () => {
    const manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      content_scripts: [
        {
          ts: [resolve(cwd, "test/resources/test.ts")],
        },
        {
          ts: [resolve(cwd, "test/resources/test2.ts")],
        },
      ],
    });
    const manifestFile = resolve(build.dist, "manifest.json");

    await build.parseManifest(manifest);

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.write).toHaveBeenCalledWith(
      manifestFile,
      JSON.stringify(manifest, null, 2).replace(`"ts"`, `"js"`)
    );
    expect(Bun.write).toHaveBeenCalledTimes(1);
    expect(Array.prototype.shift).toHaveBeenCalledTimes(2);
  });

  test("test with everything", async () => {
    const manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: resolve(cwd, "test/resources/test.ts"),
      },
      content_scripts: [
        {
          ts: [resolve(cwd, "test/resources/test2.ts")],
        },
        {
          ts: [resolve(cwd, "test/resources/test3.ts")],
        },
      ],
    });
    const manifestFile = resolve(build.dist, "manifest.json");

    await build.parseManifest(manifest);

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.write).toHaveBeenCalledWith(
      manifestFile,
      JSON.stringify(manifest, null, 2).replace(`"ts"`, `"js"`)
    );
    expect(Bun.write).toHaveBeenCalledTimes(1);
    expect(Array.prototype.shift).toHaveBeenCalledTimes(3);
  });
});
