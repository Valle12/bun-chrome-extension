import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  spyOn,
  test,
} from "bun:test";
import { mkdir, readdir, rm } from "fs/promises";
import { join, relative, resolve } from "path";
import { Build } from "../build";
import type { FullManifest, Properties } from "../types";
import { defineManifest } from "../types";

let build: Build;
const cwd = resolve(import.meta.dir, "..");

beforeEach(async () => {
  build = new Build({
    manifest_version: 3,
    name: "test",
    version: "0.0.1",
  });
  build.config.outdir = resolve(cwd, "dist");
  await rm(build.config.outdir, { recursive: true });
});

describe("extractPaths", () => {
  test("test with no additional config", () => {
    const properties: Map<Properties, boolean> = new Map();
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
    });

    const paths = build.extractPaths(properties);

    expect(properties).toBeEmpty();
    expect(paths).toBeEmpty();
  });

  test("test with background info", () => {
    const properties: Map<Properties, boolean> = new Map();
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: "test1.ts",
      },
    });

    const paths = build.extractPaths(properties);

    expect(properties.get("background.service_worker")).toBeTrue();
    expect(properties.get("content_scripts.ts")).toBeUndefined();
    expect(paths.length).toBe(1);
    const file = resolve("test1.ts");
    expect(paths[0]).toBe(file);
    expect(build.manifest.background?.service_worker).toBe(file);
  });

  test("test with content_scripts info", () => {
    const properties: Map<Properties, boolean> = new Map();
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      content_scripts: [
        {
          ts: ["test1.ts"],
        },
      ],
    });

    const paths = build.extractPaths(properties);

    expect(properties.get("background.service_worker")).toBeUndefined();
    expect(properties.get("content_scripts.ts")).toBeTrue();
    expect(paths.length).toBe(1);
    const file = resolve("test1.ts");
    expect(paths[0]).toBe(file);
    const contentScripts = build.manifest.content_scripts;
    if (!contentScripts) throw new Error("content_scripts is undefined");
    const ts = contentScripts[0].ts;
    if (!ts) throw new Error("ts is undefined");
    expect(ts[0]).toBe(file);
  });

  test("test with background and content_scripts info", () => {
    const properties: Map<Properties, boolean> = new Map();
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: "src/test1.ts",
      },
      content_scripts: [
        {
          ts: ["test2.ts"],
        },
      ],
    });

    const paths = build.extractPaths(properties);

    expect(properties.get("background.service_worker")).toBeTrue();
    expect(properties.get("content_scripts.ts")).toBeTrue();
    expect(paths.length).toBe(2);
    const file1 = resolve("src/test1.ts");
    expect(paths[0]).toBe(file1);
    const file2 = resolve("test2.ts");
    expect(paths[1]).toBe(file2);
    expect(build.manifest.background?.service_worker).toBe(file1);
    const contentScripts = build.manifest.content_scripts;
    if (!contentScripts) throw new Error("content_scripts is undefined");
    const ts = contentScripts[0].ts;
    if (!ts) throw new Error("ts is undefined");
    expect(ts[0]).toBe(file2);
  });

  test("test with multiple ts files", () => {
    const properties: Map<Properties, boolean> = new Map();
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      content_scripts: [
        {
          ts: ["test1.ts", "src/test2.ts"],
        },
      ],
    });

    const paths = build.extractPaths(properties);

    expect(properties.get("background.service_worker")).toBeUndefined();
    expect(properties.get("content_scripts.ts")).toBeTrue();
    expect(paths.length).toBe(2);
    const file1 = resolve("test1.ts");
    expect(paths[0]).toBe(file1);
    const file2 = resolve("src/test2.ts");
    expect(paths[1]).toBe(file2);
    const contentScripts = build.manifest.content_scripts;
    if (!contentScripts) throw new Error("content_scripts is undefined");
    const ts = contentScripts[0].ts;
    if (!ts) throw new Error("ts is undefined");
    expect(ts[0]).toBe(file1);
    expect(ts[1]).toBe(file2);
  });

  test("test with multiple content_scripts", () => {
    const properties: Map<Properties, boolean> = new Map();
    build.manifest = defineManifest({
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

    const paths = build.extractPaths(properties);

    expect(properties.get("background.service_worker")).toBeUndefined();
    expect(properties.get("content_scripts.ts")).toBeTrue();
    expect(paths.length).toBe(2);
    const file1 = resolve("test1.ts");
    expect(paths[0]).toBe(file1);
    const file2 = resolve("test2.ts");
    expect(paths[1]).toBe(file2);
    const contentScripts = build.manifest.content_scripts;
    if (!contentScripts) throw new Error("content_scripts is undefined");
    const ts = contentScripts[0].ts;
    if (!ts) throw new Error("ts is undefined");
    expect(ts[0]).toBe(file1);
    const ts2 = contentScripts[1].ts;
    if (!ts2) throw new Error("ts2 is undefined");
    expect(ts2[0]).toBe(file2);
  });

  test("test with everything", () => {
    const properties: Map<Properties, boolean> = new Map();
    build.manifest = defineManifest({
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

    const paths = build.extractPaths(properties);

    expect(properties.get("background.service_worker")).toBeTrue();
    expect(properties.get("content_scripts.ts")).toBeTrue();
    expect(paths.length).toBe(4);
    const file1 = resolve("src/test1.ts");
    expect(paths[0]).toBe(file1);
    const file2 = resolve("test1.ts");
    expect(paths[1]).toBe(file2);
    const file3 = resolve("test2.ts");
    expect(paths[2]).toBe(file3);
    const file4 = resolve("test3.ts");
    expect(paths[3]).toBe(file4);
    expect(build.manifest.background?.service_worker).toBe(file1);
    const contentScripts = build.manifest.content_scripts;
    if (!contentScripts) throw new Error("content_scripts is undefined");
    const ts = contentScripts[0].ts;
    if (!ts) throw new Error("ts is undefined");
    expect(ts[0]).toBe(file2);
    const ts2 = contentScripts[1].ts;
    if (!ts2) throw new Error("ts2 is undefined");
    expect(ts2[0]).toBe(file3);
    expect(ts2[1]).toBe(file4);
  });
});

describe("extractPathsFromHTML", () => {
  test("test with no additional config", async () => {
    const properties: Map<Properties, boolean> = new Map();
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
    });

    const htmlTypes = await build.extractPathsFromHTML(properties);

    expect(properties).toBeEmpty();
    expect(htmlTypes).toBeEmpty();
  });

  test("test with popup info", async () => {
    const properties: Map<Properties, boolean> = new Map();
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      action: {
        default_popup: resolve(cwd, "test/resources/popup.html"),
      },
    });

    const htmlTypes = await build.extractPathsFromHTML(properties);

    expect(properties.get("action.default_popup")).toBeTrue();
    expect(htmlTypes.length).toBe(1);
    expect(htmlTypes[0].property).toBe("action.default_popup");
    expect(htmlTypes[0].scripts?.length).toBe(1);
    if (!htmlTypes[0].scripts) throw new Error("scripts is undefined");
    expect(htmlTypes[0].scripts[0]).toBe("test3.ts");
    expect(htmlTypes[0].resolvedScripts?.length).toBe(1);
    if (!htmlTypes[0].resolvedScripts)
      throw new Error("resolvedScripts is undefined");
    expect(htmlTypes[0].resolvedScripts[0]).toBe(
      resolve(cwd, "test/resources/test3.ts")
    );
  });

  test("test with options_page info", async () => {
    const properties: Map<Properties, boolean> = new Map();
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      options_page: resolve(cwd, "test/resources/optionsPage.html"),
    });

    const htmlTypes = await build.extractPathsFromHTML(properties);

    expect(properties.get("options_page")).toBeTrue();
    expect(htmlTypes.length).toBe(1);
    expect(htmlTypes[0].property).toBe("options_page");
    expect(htmlTypes[0].scripts?.length).toBe(1);
    if (!htmlTypes[0].scripts) throw new Error("scripts is undefined");
    expect(htmlTypes[0].scripts[0]).toBe("test4.ts");
    expect(htmlTypes[0].resolvedScripts?.length).toBe(1);
    if (!htmlTypes[0].resolvedScripts)
      throw new Error("resolvedScripts is undefined");
    expect(htmlTypes[0].resolvedScripts[0]).toBe(
      resolve(cwd, "test/resources/test4.ts")
    );
  });

  test("test with options_ui info", async () => {
    const properties: Map<Properties, boolean> = new Map();
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      options_ui: {
        page: resolve(cwd, "test/resources/optionsUI.html"),
      },
    });

    const htmlTypes = await build.extractPathsFromHTML(properties);

    expect(properties.get("options_ui.page")).toBeTrue();
    expect(htmlTypes.length).toBe(1);
    expect(htmlTypes[0].property).toBe("options_ui.page");
    expect(htmlTypes[0].scripts?.length).toBe(1);
    if (!htmlTypes[0].scripts) throw new Error("scripts is undefined");
    expect(htmlTypes[0].scripts[0]).toBe("src/test5.ts");
    expect(htmlTypes[0].resolvedScripts?.length).toBe(1);
    if (!htmlTypes[0].resolvedScripts)
      throw new Error("resolvedScripts is undefined");
    expect(htmlTypes[0].resolvedScripts[0]).toBe(
      resolve(cwd, "test/resources/src/test5.ts")
    );
  });

  test("test with everything", async () => {
    const properties: Map<Properties, boolean> = new Map();
    build.manifest = defineManifest({
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

    const htmlTypes = await build.extractPathsFromHTML(properties);

    expect(htmlTypes.length).toBe(3);

    expect(properties.get("action.default_popup")).toBeTrue();
    expect(htmlTypes[0].property).toBe("action.default_popup");
    expect(htmlTypes[0].scripts?.length).toBe(1);
    if (!htmlTypes[0].scripts) throw new Error("scripts is undefined");
    expect(htmlTypes[0].scripts[0]).toBe("test3.ts");
    expect(htmlTypes[0].resolvedScripts?.length).toBe(1);
    if (!htmlTypes[0].resolvedScripts)
      throw new Error("resolvedScripts is undefined");
    expect(htmlTypes[0].resolvedScripts[0]).toBe(
      resolve(cwd, "test/resources/test3.ts")
    );

    expect(properties.get("options_page")).toBeTrue();
    expect(htmlTypes[1].property).toBe("options_page");
    expect(htmlTypes[1].scripts?.length).toBe(1);
    if (!htmlTypes[1].scripts) throw new Error("scripts is undefined");
    expect(htmlTypes[1].scripts[0]).toBe("test4.ts");
    expect(htmlTypes[1].resolvedScripts?.length).toBe(1);
    if (!htmlTypes[1].resolvedScripts)
      throw new Error("resolvedScripts is undefined");
    expect(htmlTypes[1].resolvedScripts[0]).toBe(
      resolve(cwd, "test/resources/test4.ts")
    );

    expect(properties.get("options_ui.page")).toBeTrue();
    expect(htmlTypes[2].property).toBe("options_ui.page");
    expect(htmlTypes[2].scripts?.length).toBe(1);
    if (!htmlTypes[2].scripts) throw new Error("scripts is undefined");
    expect(htmlTypes[2].scripts[0]).toBe("src/test5.ts");
    expect(htmlTypes[2].resolvedScripts?.length).toBe(1);
    if (!htmlTypes[2].resolvedScripts)
      throw new Error("resolvedScripts is undefined");
    expect(htmlTypes[2].resolvedScripts[0]).toBe(
      resolve(cwd, "test/resources/src/test5.ts")
    );
  });

  test("test with multiple scripts in html", async () => {
    const properties: Map<Properties, boolean> = new Map();
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      action: {
        default_popup: resolve(cwd, "test/resources/multiple.html"),
      },
    });

    const htmlTypes = await build.extractPathsFromHTML(properties);

    expect(properties.get("action.default_popup")).toBeTrue();
    expect(htmlTypes.length).toBe(1);
    expect(htmlTypes[0].property).toBe("action.default_popup");
    expect(htmlTypes[0].scripts?.length).toBe(3);
    if (!htmlTypes[0].scripts) throw new Error("scripts is undefined");
    expect(htmlTypes[0].scripts[0]).toBe("test1.ts");
    expect(htmlTypes[0].scripts[1]).toBe("test2.ts");
    expect(htmlTypes[0].scripts[2]).toBe("test3.ts");
    expect(htmlTypes[0].resolvedScripts?.length).toBe(3);
    if (!htmlTypes[0].resolvedScripts)
      throw new Error("resolvedScripts is undefined");
    expect(htmlTypes[0].resolvedScripts[0]).toBe(
      resolve(cwd, "test/resources/test1.ts")
    );
    expect(htmlTypes[0].resolvedScripts[1]).toBe(
      resolve(cwd, "test/resources/test2.ts")
    );
    expect(htmlTypes[0].resolvedScripts[2]).toBe(
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

    const properties: Map<Properties, boolean> = new Map();
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      action: {
        default_popup: tmp,
      },
    });

    const htmlTypes = await build.extractPathsFromHTML(properties);

    expect(properties.get("action.default_popup")).toBeTrue();
    expect(htmlTypes.length).toBe(1);
    expect(htmlTypes[0].property).toBe("action.default_popup");
    expect(htmlTypes[0].scripts?.length).toBe(1);
    if (!htmlTypes[0].scripts) throw new Error("scripts is undefined");
    expect(htmlTypes[0].scripts[0]).toBe(
      resolve(cwd, "test/resources/test1.ts")
    );
    expect(htmlTypes[0].resolvedScripts?.length).toBe(1);
    if (!htmlTypes[0].resolvedScripts)
      throw new Error("resolvedScripts is undefined");
    expect(htmlTypes[0].resolvedScripts[0]).toBe(
      resolve(cwd, "test/resources/test1.ts")
    );

    await rm(tmp);
  });
});

describe("parseManifest", () => {
  beforeEach(() => {
    spyOn(Bun, "build");
    spyOn(Bun, "write");
    spyOn(Array.prototype, "shift");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("test with no additional config", async () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
    });

    await build.parseManifest();

    expect(Bun.build).not.toHaveBeenCalled();
  });

  test("test with background info", async () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: resolve(cwd, "test/resources/test1.ts"),
      },
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Array.prototype.shift).toHaveBeenCalledTimes(1);
    expect(build.manifest.background?.service_worker).toContain("test1-");
    expect(build.manifest.background?.service_worker).toContain(".js");
  });

  test("test with content_scripts info", async () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      content_scripts: [
        {
          ts: [resolve(cwd, "test/resources/test1.ts")],
        },
      ],
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Array.prototype.shift).toHaveBeenCalledTimes(1);
    const contentScripts = build.manifest.content_scripts;
    if (!contentScripts) throw new Error("content_scripts is undefined");
    const ts = contentScripts[0].ts;
    if (!ts) throw new Error("ts is undefined");
    expect(ts[0]).toContain("test1-");
    expect(ts[0]).toContain(".js");
  });

  test("test with background and content_scripts info", async () => {
    build.manifest = defineManifest({
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

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Array.prototype.shift).toHaveBeenCalledTimes(2);
    expect(build.manifest.background?.service_worker).toContain("test1-");
    expect(build.manifest.background?.service_worker).toContain(".js");
    const contentScripts = build.manifest.content_scripts;
    if (!contentScripts) throw new Error("content_scripts is undefined");
    const ts = contentScripts[0].ts;
    if (!ts) throw new Error("ts is undefined");
    expect(ts[0]).toContain("test2-");
    expect(ts[0]).toContain(".js");
  });

  test("test with multiple ts files", async () => {
    build.manifest = defineManifest({
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

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Array.prototype.shift).toHaveBeenCalledTimes(2);
    const contentScripts = build.manifest.content_scripts;
    if (!contentScripts) throw new Error("content_scripts is undefined");
    const ts = contentScripts[0].ts;
    if (!ts) throw new Error("ts is undefined");
    expect(ts[0]).toContain("test1-");
    expect(ts[0]).toContain(".js");
    expect(ts[1]).toContain("test2-");
    expect(ts[1]).toContain(".js");
  });

  test("test with multiple content_scripts", async () => {
    build.manifest = defineManifest({
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

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Array.prototype.shift).toHaveBeenCalledTimes(2);
    const contentScripts = build.manifest.content_scripts;
    if (!contentScripts) throw new Error("content_scripts is undefined");
    const ts = contentScripts[0].ts;
    if (!ts) throw new Error("ts is undefined");
    expect(ts[0]).toContain("test1-");
    expect(ts[0]).toContain(".js");
    const ts2 = contentScripts[1].ts;
    if (!ts2) throw new Error("ts2 is undefined");
    expect(ts2[0]).toContain("test2-");
    expect(ts2[0]).toContain(".js");
  });

  test("test with popup info", async () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      action: {
        default_popup: resolve(cwd, "test/resources/popup.html"),
      },
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.write).toHaveBeenCalledTimes(1);
    expect(build.manifest.action?.default_popup).toContain("popup-");
  });

  test("test with options_page info", async () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      options_page: resolve(cwd, "test/resources/optionsPage.html"),
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.write).toHaveBeenCalledTimes(1);
    expect(build.manifest.options_page).toContain("optionsPage-");
  });

  test("test with options_ui info", async () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      options_ui: {
        page: resolve(cwd, "test/resources/optionsUI.html"),
      },
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.write).toHaveBeenCalledTimes(1);
    expect(build.manifest.options_ui?.page).toContain("optionsUI-");
  });

  test("test two properties pointing to the same file", async () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: resolve(cwd, "test/resources/test1.ts"),
      },
      content_scripts: [
        {
          ts: [resolve(cwd, "test/resources/test1.ts")],
        },
      ],
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(build.manifest.background?.service_worker).toContain("test1-");
    expect(build.manifest.background?.service_worker).toContain(".js");
    const contentScripts = build.manifest.content_scripts;
    if (!contentScripts) throw new Error("content_scripts is undefined");
    const ts = contentScripts[0].ts;
    if (!ts) throw new Error("ts is undefined");
    expect(ts[0]).toContain("test1-");
    expect(ts[0]).toContain(".js");
  });

  test("test two properties pointing to the same file and multiple ts files", async () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: resolve(cwd, "test/resources/test1.ts"),
      },
      content_scripts: [
        {
          ts: [
            resolve(cwd, "test/resources/test1.ts"),
            resolve(cwd, "test/resources/test2.ts"),
          ],
        },
      ],
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(build.manifest.background?.service_worker).toContain("test1-");
    expect(build.manifest.background?.service_worker).toContain(".js");
    const contentScripts = build.manifest.content_scripts;
    if (!contentScripts) throw new Error("content_scripts is undefined");
    const ts = contentScripts[0].ts;
    if (!ts) throw new Error("ts is undefined");
    expect(ts[0]).toContain("test1-");
    expect(ts[0]).toContain(".js");
    expect(ts[1]).toContain("test2-");
    expect(ts[1]).toContain(".js");
  });

  test("test two properties pointing to the same file and multiple content_scripts", async () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: resolve(cwd, "test/resources/test1.ts"),
      },
      content_scripts: [
        {
          ts: [resolve(cwd, "test/resources/test1.ts")],
        },
        {
          ts: [resolve(cwd, "test/resources/test2.ts")],
        },
      ],
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(build.manifest.background?.service_worker).toContain("test1-");
    expect(build.manifest.background?.service_worker).toContain(".js");
    const contentScripts = build.manifest.content_scripts;
    if (!contentScripts) throw new Error("content_scripts is undefined");
    const ts = contentScripts[0].ts;
    if (!ts) throw new Error("ts is undefined");
    expect(ts[0]).toContain("test1-");
    expect(ts[0]).toContain(".js");
    const ts2 = contentScripts[1].ts;
    if (!ts2) throw new Error("ts2 is undefined");
    expect(ts2[0]).toContain("test2-");
    expect(ts2[0]).toContain(".js");
  });

  test("test with 5 entries while the ts files point to the same file", async () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: resolve(cwd, "test/resources/test1.ts"),
      },
      content_scripts: [
        {
          ts: [
            resolve(cwd, "test/resources/test2.ts"),
            resolve(cwd, "test/resources/test3.ts"),
          ],
        },
        {
          ts: [
            resolve(cwd, "test/resources/test3.ts"),
            resolve(cwd, "test/resources/test2.ts"),
          ],
        },
      ],
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(build.manifest.background?.service_worker).toContain("test1-");
    expect(build.manifest.background?.service_worker).toContain(".js");
    const contentScripts = build.manifest.content_scripts;
    if (!contentScripts) throw new Error("content_scripts is undefined");
    const ts = contentScripts[0].ts;
    if (!ts) throw new Error("ts is undefined");
    expect(ts[0]).toContain("test2-");
    expect(ts[0]).toContain(".js");
    expect(ts[1]).toContain("test3-");
    expect(ts[1]).toContain(".js");
    const ts2 = contentScripts[1].ts;
    if (!ts2) throw new Error("ts2 is undefined");
    expect(ts2[0]).toContain("test3-");
    expect(ts2[0]).toContain(".js");
    expect(ts2[1]).toContain("test2-");
    expect(ts2[1]).toContain(".js");
  });

  test("test with everything", async () => {
    build.manifest = defineManifest({
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

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.write).toHaveBeenCalledTimes(3);
    expect(build.manifest.background?.service_worker).toContain("test1-");
    expect(build.manifest.background?.service_worker).toContain(".js");
    const contentScripts = build.manifest.content_scripts;
    if (!contentScripts) throw new Error("content_scripts is undefined");
    const ts = contentScripts[0].ts;
    if (!ts) throw new Error("ts is undefined");
    expect(ts[0]).toContain("test2-");
    expect(ts[0]).toContain(".js");
    expect(build.manifest.action?.default_popup).toContain("popup-");
    expect(build.manifest.options_page).toContain("optionsPage-");
    expect(build.manifest.options_ui?.page).toContain("optionsUI-");

    if (!build.manifest.action?.default_popup)
      throw new Error("default_popup is undefined");
    const popup = await Bun.file(
      resolve(build.config.outdir, build.manifest.action?.default_popup)
    ).text();
    expect(popup).toContain("test3-");
    expect(popup).toContain(".js");
    if (!build.manifest.options_page)
      throw new Error("options_page is undefined");
    const optionsPage = await Bun.file(
      resolve(build.config.outdir, build.manifest.options_page)
    ).text();
    expect(optionsPage).toContain("test4-");
    expect(optionsPage).toContain(".js");
    if (!build.manifest.options_ui?.page)
      throw new Error("options_ui.page is undefined");
    const optionsUI = await Bun.file(
      resolve(build.config.outdir, build.manifest.options_ui?.page)
    ).text();
    expect(optionsUI).toContain("src/test5-");
    expect(optionsUI).toContain(".js");
  });
});

describe("writeManifest", () => {
  beforeEach(async () => {
    spyOn(Bun, "write");
    await rm(resolve(cwd, "public"), { recursive: true });
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await rm(resolve(cwd, "public"), { recursive: true });
  });

  test("test with minimal config", async () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
    });

    await build.writeManifest();

    expect(Bun.write).toHaveBeenCalledTimes(1);
    const content = await Bun.file(
      resolve(build.config.outdir, "manifest.json")
    ).text();
    expect(content).toContain(`"name": "test"`);
    expect(content).toContain(`"version": "0.0.1"`);
  });

  test("test with ts files", async () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      content_scripts: [
        {
          ts: ["test1.js"],
        },
      ],
    });

    await build.writeManifest();

    expect(Bun.write).toHaveBeenCalledTimes(1);
    const content = await Bun.file(
      resolve(build.config.outdir, "manifest.json")
    ).text();
    expect(content).toContain('"js": [');
    expect(content).toContain('"test1.js"');
  });

  test("test with png in public folder", async () => {
    build.cwd = cwd;
    await createTestPublicFolder("public", ["test/resources/icons/16.png"]);
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      icons: {
        16: "public/icons/16.png",
      },
    });

    await build.copyPublic();
    await build.writeManifest();

    const valuesArray = Array.from(build.fileToProperty.values());
    expect(valuesArray.includes("public/icons/16.png")).toBeTrue();
    expect(Bun.write).toHaveBeenCalledTimes(3);
    const content = await Bun.file(
      resolve(build.config.outdir, "manifest.json")
    ).text();
    const manifest = JSON.parse(content);
    expect(manifest.icons["16"]).toBe("public/icons/16.png");
    await rm(resolve(cwd, "public"), { recursive: true });
  });

  test.only("test with multiple ways of defining paths", async () => {
    build.cwd = cwd;
    await createTestPublicFolder("public", [
      "test/resources/icons/16.png",
      "test/resources/icons/32.png",
      "test/resources/icons/48.png",
      "test/resources/icons/128.png",
    ]);
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      icons: {
        16: "public/icons/16.png",
        32: "public\\icons\\32.png",
        48: "public/icons\\48.png",
        128: build.config.public + "/icons/128.png",
      },
    });

    await build.preprocessManifest();
    await build.copyPublic();
    await build.writeManifest();

    const valuesArray = Array.from(build.fileToProperty.values());
    expect(valuesArray.includes("public/icons/16.png")).toBeTrue();
    expect(valuesArray.includes("public/icons/32.png")).toBeTrue();
    expect(valuesArray.includes("public/icons/48.png")).toBeTrue();
    expect(valuesArray.includes("public/icons/128.png")).toBeTrue();
    expect(Bun.write).toHaveBeenCalledTimes(9);
  });
});

describe("copyPublic", () => {
  beforeEach(async () => {
    spyOn(Bun, "write");
    spyOn(await import("fs/promises"), "readdir");
    await rm(resolve(cwd, "public"), { recursive: true });
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await rm(resolve(cwd, "public"), { recursive: true });
  });

  test("test with no public dir", async () => {
    await build.copyPublic();

    expect(readdir).not.toHaveBeenCalled();
  });

  test("test with empty public dir", async () => {
    await mkdir(resolve(cwd, "public"));

    await build.copyPublic();

    expect(readdir).toHaveBeenCalledTimes(1);
    expect(Bun.write).not.toHaveBeenCalled();
  });

  test("test with file in public folder", async () => {
    build.cwd = cwd;
    await createTestPublicFolder("public", ["test/resources/icons/16.png"]);

    await build.copyPublic();

    expect(readdir).toHaveBeenCalledTimes(1);
    expect(Bun.write).toHaveBeenCalledTimes(4);
    const files = await readdir(resolve(build.config.outdir, "public"), {
      recursive: true,
    });
    expect(files.length).toBe(5); // icons also counts
  });
});

describe("parse", () => {
  beforeEach(() => {
    spyOn(build, "preprocessManifest");
    spyOn(build, "parseManifest");
    spyOn(build, "copyPublic");
    spyOn(build, "writeManifest");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("test with no additional config", async () => {
    build.config.public = resolve(cwd, "public");

    await build.parse();

    expect(build.preprocessManifest).toHaveBeenCalledTimes(1);
    expect(build.parseManifest).toHaveBeenCalledTimes(1);
    expect(build.copyPublic).toHaveBeenCalledTimes(1);
    expect(build.writeManifest).toHaveBeenCalledTimes(1);
    expect(build.fileToProperty).toBeEmpty();
  });

  test("test with manifest, but no public folder", async () => {
    build.config.public = resolve(cwd, "test/resources/empty");
    await mkdir(build.config.public);
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: resolve(cwd, "test/resources/test1.ts"),
      },
    });

    await build.parse();

    expect(build.preprocessManifest).toHaveBeenCalledTimes(1);
    expect(build.parseManifest).toHaveBeenCalledTimes(1);
    expect(build.copyPublic).toHaveBeenCalledTimes(1);
    expect(build.writeManifest).toHaveBeenCalledTimes(1);
    expect(build.fileToProperty.size).toBe(1);
    expect(
      build.fileToProperty.get(resolve(cwd, "test/resources/test1.ts"))
    ).toContain(resolve(build.config.outdir, "test1-"));
    const manifestJson = await Bun.file(
      resolve(build.config.outdir, "manifest.json")
    ).text();
    const manifest: FullManifest = JSON.parse(manifestJson);
    expect(manifest.background?.service_worker).toContain("test1-");
    await rm(build.config.public, { recursive: true });
  });

  test("test with basic manifest and public folder", async () => {
    build.config.public = resolve(cwd, "test/resources/public");
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
    });

    await build.parse();

    expect(build.parseManifest).toHaveBeenCalledTimes(1);
    expect(build.copyPublic).toHaveBeenCalledTimes(1);
    expect(build.writeManifest).toHaveBeenCalledTimes(1);
    const files = await readdir(build.config.outdir, { recursive: true });
    expect(files.length).toBe(7);
  });
});

async function createTestPublicFolder(publicFolder: string, files: string[]) {
  for (const file of files) {
    const inputFilePath = resolve(cwd, file);
    const inputFile = Bun.file(inputFilePath);
    const resolvedPublic = resolve(cwd, publicFolder);
    const outDir = resolve(
      resolvedPublic,
      relative(join(cwd, "test/resources"), inputFilePath)
    );
    await Bun.write(outDir, inputFile);
  }
}
