import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  spyOn,
  test,
} from "bun:test";
import { rm } from "fs/promises";
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
        service_worker: "test1.ts",
      },
    });

    const paths = build.extractPaths(manifest, properties);

    expect(properties.background).toBeTrue();
    expect(properties.content_scripts).toBeUndefined();
    expect(paths.length).toBe(1);
    expect(paths[0]).toBe(resolve("test1.ts"));
  });

  test("test with content_scripts info", () => {
    const properties: { [key: string]: boolean } = {};
    const manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      content_scripts: [
        {
          ts: ["test1.ts"],
        },
      ],
    });

    const paths = build.extractPaths(manifest, properties);

    expect(properties.background).toBeUndefined();
    expect(properties.content_scripts).toBeTrue();
    expect(paths.length).toBe(1);
    expect(paths[0]).toBe(resolve("test1.ts"));
  });

  test("test with background and content_scripts info", () => {
    const properties: { [key: string]: boolean } = {};
    const manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: "src/test1.ts",
      },
      content_scripts: [
        {
          ts: ["test1.ts"],
        },
      ],
    });

    const paths = build.extractPaths(manifest, properties);

    expect(properties.background).toBeTrue();
    expect(properties.content_scripts).toBeTrue();
    expect(paths.length).toBe(2);
    expect(paths[0]).toBe(resolve("src/test1.ts"));
    expect(paths[1]).toBe(resolve("test1.ts"));
  });

  test("test with multiple ts files", () => {
    const properties: { [key: string]: boolean } = {};
    const manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      content_scripts: [
        {
          ts: ["test1.ts", "src/test2.ts"],
        },
      ],
    });

    const paths = build.extractPaths(manifest, properties);

    expect(properties.background).toBeUndefined();
    expect(properties.content_scripts).toBeTrue();
    expect(paths.length).toBe(2);
    expect(paths[0]).toBe(resolve("test1.ts"));
    expect(paths[1]).toBe(resolve("src/test2.ts"));
  });

  test("test with multiple content_scripts", () => {
    const properties: { [key: string]: boolean } = {};
    const manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      content_scripts: [
        {
          ts: ["test1.ts"],
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
    expect(paths[0]).toBe(resolve("test1.ts"));
    expect(paths[1]).toBe(resolve("test2.ts"));
  });

  test("test with everything", () => {
    const properties: { [key: string]: boolean } = {};
    const manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: "src/test1.ts",
      },
      content_scripts: [
        {
          ts: ["test1.ts"],
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
    expect(paths[0]).toBe(resolve("src/test1.ts"));
    expect(paths[1]).toBe(resolve("test1.ts"));
    expect(paths[2]).toBe(resolve("test2.ts"));
    expect(paths[3]).toBe(resolve("test3.ts"));
  });
});

describe("extractPathsFromHTML", () => {
  beforeEach(() => {
    build = new Build();
    build.dist = resolve(cwd, "dist");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("test with no additional config", async () => {
    const properties: { [key: string]: boolean } = {};
    const manifest = defineManifest({
      name: "test",
      version: "0.0.1",
    });

    const htmlTypeToPaths = await build.extractPathsFromHTML(
      manifest,
      properties
    );

    expect(properties).toEqual({});
    expect(htmlTypeToPaths).toEqual({});
  });

  test("test with popup info", async () => {
    const properties: { [key: string]: boolean } = {};
    const manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      action: {
        default_popup: resolve(cwd, "test/resources/popup.html"),
      },
    });

    const htmlTypeToPaths = await build.extractPathsFromHTML(
      manifest,
      properties
    );

    expect(properties.popup).toBeTrue();
    expect(htmlTypeToPaths.popup.length).toBe(1);
    expect(htmlTypeToPaths.popup[0]).toBe(
      resolve(cwd, "test/resources/test3.ts")
    );
  });

  test("test with options_page info", async () => {
    const properties: { [key: string]: boolean } = {};
    const manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      options_page: resolve(cwd, "test/resources/optionsPage.html"),
    });

    const htmlTypeToPaths = await build.extractPathsFromHTML(
      manifest,
      properties
    );

    expect(properties.optionsPage).toBeTrue();
    expect(htmlTypeToPaths.optionsPage.length).toBe(1);
    expect(htmlTypeToPaths.optionsPage[0]).toBe(
      resolve(cwd, "test/resources/test4.ts")
    );
  });

  test("test with options_ui info", async () => {
    const properties: { [key: string]: boolean } = {};
    const manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      options_ui: {
        page: resolve(cwd, "test/resources/optionsUI.html"),
      },
    });

    const htmlTypeToPaths = await build.extractPathsFromHTML(
      manifest,
      properties
    );

    expect(properties.optionsUI).toBeTrue();
    expect(htmlTypeToPaths.optionsUI.length).toBe(1);
    expect(htmlTypeToPaths.optionsUI[0]).toBe(
      resolve(cwd, "test/resources/src/test5.ts")
    );
  });

  test("test with everything", async () => {
    const properties: { [key: string]: boolean } = {};
    const manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      action: {
        default_popup: resolve(cwd, "test/resources/popup.html"),
      },
      options_page: resolve(cwd, "test/resources/optionsPage.html"),
      options_ui: {
        page: resolve(cwd, "test/resources/optionsUI.html"),
      },
    });

    const htmlTypeToPaths = await build.extractPathsFromHTML(
      manifest,
      properties
    );

    expect(properties.popup).toBeTrue();
    expect(htmlTypeToPaths.popup.length).toBe(1);
    expect(htmlTypeToPaths.popup[0]).toBe(
      resolve(cwd, "test/resources/test3.ts")
    );

    expect(properties.optionsPage).toBeTrue();
    expect(htmlTypeToPaths.optionsPage.length).toBe(1);
    expect(htmlTypeToPaths.optionsPage[0]).toBe(
      resolve(cwd, "test/resources/test4.ts")
    );

    expect(properties.optionsUI).toBeTrue();
    expect(htmlTypeToPaths.optionsUI.length).toBe(1);
    expect(htmlTypeToPaths.optionsUI[0]).toBe(
      resolve(cwd, "test/resources/src/test5.ts")
    );
  });

  test("test with multiple scripts in html", async () => {
    const properties: { [key: string]: boolean } = {};
    const manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      action: {
        default_popup: resolve(cwd, "test/resources/multiple.html"),
      },
    });

    const htmlTypeToPaths = await build.extractPathsFromHTML(
      manifest,
      properties
    );

    expect(properties.popup).toBeTrue();
    expect(htmlTypeToPaths.popup.length).toBe(3);
    expect(htmlTypeToPaths.popup[0]).toBe(
      resolve(cwd, "test/resources/test1.ts")
    );
    expect(htmlTypeToPaths.popup[1]).toBe(
      resolve(cwd, "test/resources/test2.ts")
    );
    expect(htmlTypeToPaths.popup[2]).toBe(
      resolve(cwd, "test/resources/test3.ts")
    );
  });

  test("test with absolute path in html", async () => {
    let content = await Bun.file(
      resolve(cwd, "test/resources/src/absolute.html")
    ).text();
    content = content.replace(
      "PLACEHOLDER",
      resolve(cwd, "test/resources/test1.ts")
    );
    const tmp = resolve(cwd, "test/resources/src/tmp.html");
    await Bun.write(tmp, content);

    const properties: { [key: string]: boolean } = {};
    const manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      action: {
        default_popup: tmp,
      },
    });

    const htmlTypeToPaths = await build.extractPathsFromHTML(
      manifest,
      properties
    );

    expect(properties.popup).toBeTrue();
    expect(htmlTypeToPaths.popup.length).toBe(1);
    expect(htmlTypeToPaths.popup[0]).toBe(
      resolve(cwd, "test/resources/test1.ts")
    );

    await rm(tmp);
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
        service_worker: resolve(cwd, "test/resources/test1.ts"),
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
          ts: [resolve(cwd, "test/resources/test1.ts")],
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
        service_worker: resolve(cwd, "test/resources/test1.ts"),
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
            resolve(cwd, "test/resources/test1.ts"),
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
          ts: [resolve(cwd, "test/resources/test1.ts")],
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

  test("test with popup info", async () => {
    const manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      action: {
        default_popup: resolve(cwd, "test/resources/popup.html"),
      },
    });
    const manifestFile = resolve(build.dist, "manifest.json");

    await build.parseManifest(manifest);

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.write).toHaveBeenCalledWith(
      manifestFile,
      JSON.stringify(manifest, null, 2).replace(`"ts"`, `"js"`)
    );
    expect(Bun.write).toHaveBeenCalledTimes(1);
    expect(manifest.action?.default_popup).toBe(
      resolve(build.dist, "test3.js")
    );
  });

  test("test with options_page info", async () => {
    const manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      options_page: resolve(cwd, "test/resources/optionsPage.html"),
    });
    const manifestFile = resolve(build.dist, "manifest.json");

    await build.parseManifest(manifest);

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.write).toHaveBeenCalledWith(
      manifestFile,
      JSON.stringify(manifest, null, 2).replace(`"ts"`, `"js"`)
    );
    expect(Bun.write).toHaveBeenCalledTimes(1);
    expect(manifest.options_page).toBe(resolve(build.dist, "test4.js"));
  });

  test("test with options_ui info", async () => {
    const manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      options_ui: {
        page: resolve(cwd, "test/resources/optionsUI.html"),
      },
    });
    const manifestFile = resolve(build.dist, "manifest.json");

    await build.parseManifest(manifest);

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.write).toHaveBeenCalledWith(
      manifestFile,
      JSON.stringify(manifest, null, 2).replace(`"ts"`, `"js"`)
    );
    expect(Bun.write).toHaveBeenCalledTimes;
    expect(manifest.options_ui?.page).toBe(resolve(build.dist, "test5.js"));
  });

  test("test with everything", async () => {
    const manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: resolve(cwd, "test/resources/test1.ts"),
      },
      content_scripts: [
        {
          ts: [resolve(cwd, "test/resources/test2.ts")],
        },
      ],
      action: {
        default_popup: resolve(cwd, "test/resources/popup.html"),
      },
      options_page: resolve(cwd, "test/resources/optionsPage.html"),
      options_ui: {
        page: resolve(cwd, "test/resources/optionsUI.html"),
      },
    });
    const manifestFile = resolve(build.dist, "manifest.json");

    await build.parseManifest(manifest);

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.write).toHaveBeenCalledWith(
      manifestFile,
      JSON.stringify(manifest, null, 2).replace(`"ts"`, `"js"`)
    );
    expect(Bun.write).toHaveBeenCalledTimes(1);
    expect(manifest.background?.service_worker).toBe(
      resolve(build.dist, "test1.js")
    );
    const contentScripts = manifest.content_scripts;
    if (!contentScripts) throw new Error("content_scripts is undefined");
    const ts = contentScripts[0].ts;
    if (!ts) throw new Error("ts is undefined");
    expect(ts[0]).toBe(resolve(build.dist, "test2.js"));
    expect(manifest.action?.default_popup).toBe(
      resolve(build.dist, "test3.js")
    );
    expect(manifest.options_page).toBe(resolve(build.dist, "test4.js"));
    expect(manifest.options_ui?.page).toBe(
      resolve(build.dist, "src", "test5.js")
    );
  });
});
