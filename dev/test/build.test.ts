import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";
import { mkdir, readdir, rm } from "fs/promises";
import { join, relative, resolve } from "path";
import { Build } from "../build";
import type {
  CustomContentScript,
  FullManifest,
  Icons,
  Properties,
} from "../types";
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
  await rm(build.config.outdir, { recursive: true, force: true });
});

afterEach(async () => {
  await rm(build.config.outdir, { recursive: true, force: true });
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

    expect(properties.size).toBe(1);
    expect(properties.get("background.service_worker")).toBeTrue();
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

    expect(properties.size).toBe(1);
    expect(properties.get("content_scripts.ts")).toBeTrue();
    expect(paths.length).toBe(1);
    const file = resolve("test1.ts");
    expect(paths[0]).toBe(file);
    const contentScripts = build.manifest
      .content_scripts as CustomContentScript[];
    const ts = contentScripts[0].ts as string[];
    expect(ts[0]).toBe(file);
  });

  test("test with popup info", () => {
    const properties: Map<Properties, boolean> = new Map();
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      action: {
        default_popup: "popup.html",
      },
    });

    const paths = build.extractPaths(properties);

    expect(properties.size).toBe(1);
    expect(properties.get("action.default_popup")).toBeTrue();
    expect(paths.length).toBe(1);
    const file = resolve("popup.html");
    expect(paths[0]).toBe(file);
    expect(build.manifest.action?.default_popup).toBe(file);
  });

  test("test with options_page info", () => {
    const properties: Map<Properties, boolean> = new Map();
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      options_page: "optionsPage.html",
    });

    const paths = build.extractPaths(properties);

    expect(properties.size).toBe(1);
    expect(properties.get("options_page")).toBeTrue();
    expect(paths.length).toBe(1);
    const file = resolve("optionsPage.html");
    expect(paths[0]).toBe(file);
    expect(build.manifest.options_page).toBe(file);
  });

  test("test with options_ui.page info", () => {
    const properties: Map<Properties, boolean> = new Map();
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      options_ui: {
        page: "optionsUI.html",
      },
    });

    const paths = build.extractPaths(properties);

    expect(properties.size).toBe(1);
    expect(properties.get("options_ui.page")).toBeTrue();
    expect(paths.length).toBe(1);
    const file = resolve("optionsUI.html");
    expect(paths[0]).toBe(file);
    expect(build.manifest.options_ui?.page).toBe(file);
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

    expect(properties.size).toBe(2);
    expect(properties.get("background.service_worker")).toBeTrue();
    expect(properties.get("content_scripts.ts")).toBeTrue();
    expect(paths.length).toBe(2);
    const file1 = resolve("src/test1.ts");
    expect(paths[0]).toBe(file1);
    const file2 = resolve("test2.ts");
    expect(paths[1]).toBe(file2);
    expect(build.manifest.background?.service_worker).toBe(file1);
    const contentScripts = build.manifest
      .content_scripts as CustomContentScript[];
    const ts = contentScripts[0].ts as string[];
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

    expect(properties.size).toBe(1);
    expect(properties.get("content_scripts.ts")).toBeTrue();
    expect(paths.length).toBe(2);
    const file1 = resolve("test1.ts");
    expect(paths[0]).toBe(file1);
    const file2 = resolve("src/test2.ts");
    expect(paths[1]).toBe(file2);
    const contentScripts = build.manifest
      .content_scripts as CustomContentScript[];
    const ts = contentScripts[0].ts as string[];
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

    expect(properties.size).toBe(1);
    expect(properties.get("content_scripts.ts")).toBeTrue();
    expect(paths.length).toBe(2);
    const file1 = resolve("test1.ts");
    expect(paths[0]).toBe(file1);
    const file2 = resolve("test2.ts");
    expect(paths[1]).toBe(file2);
    const contentScripts = build.manifest
      .content_scripts as CustomContentScript[];
    const ts = contentScripts[0].ts as string[];
    expect(ts[0]).toBe(file1);
    const ts2 = contentScripts[1].ts as string[];
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
      action: {
        default_popup: "popup-with-stylesheet.html",
      },
      options_page: "optionsPage.html",
      options_ui: {
        page: "optionsUI.html",
      },
    });

    const paths = build.extractPaths(properties);

    expect(properties.size).toBe(5);
    expect(properties.get("background.service_worker")).toBeTrue();
    expect(properties.get("content_scripts.ts")).toBeTrue();
    expect(properties.get("action.default_popup")).toBeTrue();
    expect(properties.get("options_page")).toBeTrue();
    expect(properties.get("options_ui.page")).toBeTrue();
    expect(paths.length).toBe(7);
    const file0 = resolve("src/test1.ts");
    expect(paths[0]).toBe(file0);
    const file1 = resolve("test1.ts");
    expect(paths[1]).toBe(file1);
    const file2 = resolve("test2.ts");
    expect(paths[2]).toBe(file2);
    const file3 = resolve("test3.ts");
    expect(paths[3]).toBe(file3);
    const file4 = resolve("popup-with-stylesheet.html");
    expect(paths[4]).toBe(file4);
    const file5 = resolve("optionsPage.html");
    expect(paths[5]).toBe(file5);
    const file6 = resolve("optionsUI.html");
    expect(paths[6]).toBe(file6);
    expect(build.manifest.background?.service_worker).toBe(file0);
    const contentScripts = build.manifest
      .content_scripts as CustomContentScript[];
    const ts = contentScripts[0].ts as string[];
    expect(ts[0]).toBe(file1);
    const ts2 = contentScripts[1].ts as string[];
    expect(ts2[0]).toBe(file2);
    expect(ts2[1]).toBe(file3);
    expect(build.manifest.action?.default_popup).toBe(file4);
    expect(build.manifest.options_page).toBe(file5);
    expect(build.manifest.options_ui?.page).toBe(file6);
  });
});

describe("parseManifest", () => {
  beforeEach(() => {
    spyOn(Bun, "build");
    spyOn(Bun, "write");
    spyOn(Array.prototype, "shift");
  });

  afterEach(() => {
    mock.restore();
  });

  test("test with no additional config", async () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
    });

    await build.parseManifest();

    expect(Bun.build).not.toHaveBeenCalled();
  });

  test("test with popup info", async () => {
    const popup = resolve(cwd, "test/resources/popup.html");
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      action: {
        default_popup: popup,
      },
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [popup],
      minify: build.config.minify,
      outdir: build.config.outdir,
      naming: "[dir]/[name]-[hash].[ext]",
    });
    expect(Array.prototype.shift).toHaveBeenCalledTimes(2);
    expect(build.manifest.action?.default_popup).toContain("popup-");
    expect(build.manifest.action?.default_popup).toContain(".html");
  });

  test("test with options_page info", async () => {
    const optionsPage = resolve(cwd, "test/resources/optionsPage.html");
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      options_page: optionsPage,
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [optionsPage],
      minify: build.config.minify,
      outdir: build.config.outdir,
      naming: "[dir]/[name]-[hash].[ext]",
    });
    expect(Array.prototype.shift).toHaveBeenCalledTimes(2);
    expect(build.manifest.options_page).toContain("optionsPage-");
    expect(build.manifest.options_page).toContain(".html");
  });

  test("test with options_ui info", async () => {
    const optionsUI = resolve(cwd, "test/resources/optionsUI.html");
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      options_ui: {
        page: optionsUI,
      },
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [optionsUI],
      minify: build.config.minify,
      outdir: build.config.outdir,
      naming: "[dir]/[name]-[hash].[ext]",
    });
    expect(Array.prototype.shift).toHaveBeenCalledTimes(2);
    expect(build.manifest.options_ui?.page).toContain("optionsUI-");
    expect(build.manifest.options_ui?.page).toContain(".html");
  });

  test("test with background info", async () => {
    const service_worker = resolve(cwd, "test/resources/test1.ts");
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: service_worker,
      },
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [service_worker],
      minify: build.config.minify,
      outdir: build.config.outdir,
      naming: "[dir]/[name]-[hash].[ext]",
    });
    expect(Array.prototype.shift).toHaveBeenCalledTimes(1);
    expect(build.manifest.background?.service_worker).toContain("test1-");
    expect(build.manifest.background?.service_worker).toContain(".js");
  });

  test("test with content_scripts info", async () => {
    const contentScript = resolve(cwd, "test/resources/test1.ts");
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      content_scripts: [
        {
          ts: [contentScript],
        },
      ],
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [contentScript],
      minify: build.config.minify,
      outdir: build.config.outdir,
      naming: "[dir]/[name]-[hash].[ext]",
    });
    expect(Array.prototype.shift).toHaveBeenCalledTimes(1);
    const contentScripts = build.manifest
      .content_scripts as CustomContentScript[];
    const ts = contentScripts[0].ts as string[];
    expect(ts[0]).toContain("test1-");
    expect(ts[0]).toContain(".js");
  });

  test("test with background and content_scripts info", async () => {
    const contentScript1 = join(cwd, "test/resources/test1.ts");
    const contentScript2 = join(cwd, "test/resources/test2.ts");
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: contentScript1,
      },
      content_scripts: [
        {
          ts: [contentScript2],
        },
      ],
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [contentScript1, contentScript2],
      minify: build.config.minify,
      outdir: build.config.outdir,
      naming: "[dir]/[name]-[hash].[ext]",
    });
    expect(Array.prototype.shift).toHaveBeenCalledTimes(2);
    expect(build.manifest.background?.service_worker).toContain("test1-");
    expect(build.manifest.background?.service_worker).toContain(".js");
    const contentScripts = build.manifest
      .content_scripts as CustomContentScript[];
    const ts = contentScripts[0].ts as string[];
    expect(ts[0]).toContain("test2-");
    expect(ts[0]).toContain(".js");
  });

  test("test with multiple ts files", async () => {
    const contentScript1 = resolve(cwd, "test/resources/test1.ts");
    const contentScript2 = resolve(cwd, "test/resources/test2.ts");
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      content_scripts: [
        {
          ts: [contentScript1, contentScript2],
        },
      ],
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [contentScript1, contentScript2],
      minify: build.config.minify,
      outdir: build.config.outdir,
      naming: "[dir]/[name]-[hash].[ext]",
    });
    expect(Array.prototype.shift).toHaveBeenCalledTimes(2);
    const contentScripts = build.manifest
      .content_scripts as CustomContentScript[];
    const ts = contentScripts[0].ts as string[];
    expect(ts[0]).toContain("test1-");
    expect(ts[0]).toContain(".js");
    expect(ts[1]).toContain("test2-");
    expect(ts[1]).toContain(".js");
  });

  test("test with multiple content_scripts", async () => {
    const contentScript1 = resolve(cwd, "test/resources/test1.ts");
    const contentScript2 = resolve(cwd, "test/resources/test2.ts");
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      content_scripts: [
        {
          ts: [contentScript1],
        },
        {
          ts: [contentScript2],
        },
      ],
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [contentScript1, contentScript2],
      minify: build.config.minify,
      outdir: build.config.outdir,
      naming: "[dir]/[name]-[hash].[ext]",
    });
    expect(Array.prototype.shift).toHaveBeenCalledTimes(2);
    const contentScripts = build.manifest
      .content_scripts as CustomContentScript[];
    const ts = contentScripts[0].ts as string[];
    expect(ts[0]).toContain("test1-");
    expect(ts[0]).toContain(".js");
    const ts2 = contentScripts[1].ts as string[];
    expect(ts2[0]).toContain("test2-");
    expect(ts2[0]).toContain(".js");
  });

  test("test with popup info", async () => {
    const popup = resolve(cwd, "test/resources/popup.html");
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      action: {
        default_popup: popup,
      },
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [popup],
      minify: build.config.minify,
      outdir: build.config.outdir,
      naming: "[dir]/[name]-[hash].[ext]",
    });
    expect(Array.prototype.shift).toHaveBeenCalledTimes(2);
    expect(build.manifest.action?.default_popup).toContain("popup-");
    expect(build.manifest.action?.default_popup).toContain(".html");
  });

  test("test with popup with script and link tags", async () => {
    const popup = resolve(cwd, "test/resources/popup-with-stylesheet.html");
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      action: {
        default_popup: popup,
      },
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [popup],
      minify: build.config.minify,
      outdir: build.config.outdir,
      naming: "[dir]/[name]-[hash].[ext]",
    });
    expect(Array.prototype.shift).toHaveBeenCalledTimes(2);
    expect(build.manifest.action?.default_popup).toContain("popup-");
    expect(build.manifest.action?.default_popup).toContain(".html");
  });

  test("test with options_page info", async () => {
    const optionsPage = resolve(cwd, "test/resources/optionsPage.html");
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      options_page: optionsPage,
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [optionsPage],
      minify: build.config.minify,
      outdir: build.config.outdir,
      naming: "[dir]/[name]-[hash].[ext]",
    });
    expect(Array.prototype.shift).toHaveBeenCalledTimes(2);
    expect(build.manifest.options_page).toContain("optionsPage-");
    expect(build.manifest.options_page).toContain(".html");
  });

  test("test with options_ui info", async () => {
    const optionsUI = resolve(cwd, "test/resources/optionsUI.html");
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      options_ui: {
        page: optionsUI,
      },
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [optionsUI],
      minify: build.config.minify,
      outdir: build.config.outdir,
      naming: "[dir]/[name]-[hash].[ext]",
    });
    expect(Array.prototype.shift).toHaveBeenCalledTimes(2);
    expect(build.manifest.options_ui?.page).toContain("optionsUI-");
    expect(build.manifest.options_ui?.page).toContain(".html");
  });

  test("test two properties pointing to the same file", async () => {
    const file1 = resolve(cwd, "test/resources/test1.ts");
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: file1,
      },
      content_scripts: [
        {
          ts: [file1],
        },
      ],
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [file1, file1],
      minify: build.config.minify,
      outdir: build.config.outdir,
      naming: "[dir]/[name]-[hash].[ext]",
    });
    expect(Array.prototype.shift).toHaveBeenCalledTimes(1);
    expect(build.manifest.background?.service_worker).toContain("test1-");
    expect(build.manifest.background?.service_worker).toContain(".js");
    const contentScripts = build.manifest
      .content_scripts as CustomContentScript[];
    const ts = contentScripts[0].ts as string[];
    expect(ts[0]).toContain("test1-");
    expect(ts[0]).toContain(".js");
  });

  test("test two properties pointing to the same file and multiple ts files", async () => {
    const file1 = resolve(cwd, "test/resources/test1.ts");
    const file2 = resolve(cwd, "test/resources/test2.ts");
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: file1,
      },
      content_scripts: [
        {
          ts: [file1, file2],
        },
      ],
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [file1, file1, file2],
      minify: build.config.minify,
      outdir: build.config.outdir,
      naming: "[dir]/[name]-[hash].[ext]",
    });
    expect(Array.prototype.shift).toHaveBeenCalledTimes(2);
    expect(build.manifest.background?.service_worker).toContain("test1-");
    expect(build.manifest.background?.service_worker).toContain(".js");
    const contentScripts = build.manifest
      .content_scripts as CustomContentScript[];
    const ts = contentScripts[0].ts as string[];
    expect(ts[0]).toContain("test1-");
    expect(ts[0]).toContain(".js");
    expect(ts[1]).toContain("test2-");
    expect(ts[1]).toContain(".js");
  });

  test("test two properties pointing to the same file and multiple content_scripts", async () => {
    const file1 = resolve(cwd, "test/resources/test1.ts");
    const file2 = resolve(cwd, "test/resources/test2.ts");
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: file1,
      },
      content_scripts: [
        {
          ts: [file1],
        },
        {
          ts: [file2],
        },
      ],
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [file1, file1, file2],
      minify: build.config.minify,
      outdir: build.config.outdir,
      naming: "[dir]/[name]-[hash].[ext]",
    });
    expect(Array.prototype.shift).toHaveBeenCalledTimes(2);
    expect(build.manifest.background?.service_worker).toContain("test1-");
    expect(build.manifest.background?.service_worker).toContain(".js");
    const contentScripts = build.manifest
      .content_scripts as CustomContentScript[];
    const ts = contentScripts[0].ts as string[];
    expect(ts[0]).toContain("test1-");
    expect(ts[0]).toContain(".js");
    const ts2 = contentScripts[1].ts as string[];
    expect(ts2[0]).toContain("test2-");
    expect(ts2[0]).toContain(".js");
  });

  test("test with 5 entries while the ts files point to the same file", async () => {
    const file1 = resolve(cwd, "test/resources/test1.ts");
    const file2 = resolve(cwd, "test/resources/test2.ts");
    const file3 = resolve(cwd, "test/resources/test3.ts");
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: file1,
      },
      content_scripts: [
        {
          ts: [file2, file3],
        },
        {
          ts: [file3, file2],
        },
      ],
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [file1, file2, file3, file3, file2],
      minify: build.config.minify,
      outdir: build.config.outdir,
      naming: "[dir]/[name]-[hash].[ext]",
    });
    expect(Array.prototype.shift).toHaveBeenCalledTimes(3);
    expect(build.manifest.background?.service_worker).toContain("test1-");
    expect(build.manifest.background?.service_worker).toContain(".js");
    const contentScripts = build.manifest
      .content_scripts as CustomContentScript[];
    const ts = contentScripts[0].ts as string[];
    expect(ts[0]).toContain("test2-");
    expect(ts[0]).toContain(".js");
    expect(ts[1]).toContain("test3-");
    expect(ts[1]).toContain(".js");
    const ts2 = contentScripts[1].ts as string[];
    expect(ts2[0]).toContain("test3-");
    expect(ts2[0]).toContain(".js");
    expect(ts2[1]).toContain("test2-");
    expect(ts2[1]).toContain(".js");
  });

  test("test with multiple html files, that contain multiple css files", async () => {
    const file1 = resolve(cwd, "test/resources/popup-with-stylesheet.html");
    const file2 = resolve(
      cwd,
      "test/resources/optionsPage-with-stylesheet.html"
    );
    const file3 = resolve(cwd, "test/resources/optionsUI-with-stylesheet.html");
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      action: {
        default_popup: file1,
      },
      options_page: file2,
      options_ui: {
        page: file3,
      },
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [file1, file2, file3],
      minify: build.config.minify,
      outdir: build.config.outdir,
      naming: "[dir]/[name]-[hash].[ext]",
    });
    expect(Array.prototype.shift).toHaveBeenCalledTimes(6);
    expect(build.manifest.action?.default_popup).toContain("popup-");
    expect(build.manifest.action?.default_popup).toContain(".html");
    expect(build.manifest.options_page).toContain("optionsPage-");
    expect(build.manifest.options_page).toContain(".html");
    expect(build.manifest.options_ui?.page).toContain("optionsUI-");
    expect(build.manifest.options_ui?.page).toContain(".html");

    const popup = await Bun.file(
      resolve(
        build.config.outdir,
        build.manifest.action?.default_popup as string
      )
    ).text();
    expect(popup).toContain("chunk-");
    expect(popup).toContain(".js");
    expect(popup).toContain(".css");

    const optionsPage = await Bun.file(
      resolve(build.config.outdir, build.manifest.options_page as string)
    ).text();
    expect(optionsPage).toContain("chunk-");
    expect(optionsPage).toContain(".js");
    expect(optionsPage).toContain(".css");

    const optionsUI = await Bun.file(
      resolve(build.config.outdir, build.manifest.options_ui?.page as string)
    ).text();
    expect(optionsUI).toContain("chunk-");
    expect(optionsUI).toContain(".js");
    expect(optionsUI).toContain(".css");
  });

  test("test with everything", async () => {
    const file1 = resolve(cwd, "test/resources/test1.ts");
    const file2 = resolve(cwd, "test/resources/test2.ts");
    const file3 = resolve(cwd, "test/resources/popup.html");
    const file4 = resolve(cwd, "test/resources/optionsPage.html");
    const file5 = resolve(cwd, "test/resources/optionsUI.html");
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: file1,
      },
      content_scripts: [
        {
          ts: [file2],
        },
      ],
      action: {
        default_popup: file3,
      },
      options_page: file4,
      options_ui: {
        page: file5,
      },
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [file1, file2, file3, file4, file5],
      minify: build.config.minify,
      outdir: build.config.outdir,
      naming: "[dir]/[name]-[hash].[ext]",
    });
    expect(Array.prototype.shift).toHaveBeenCalledTimes(8);
    expect(build.manifest.background?.service_worker).toContain("test1-");
    expect(build.manifest.background?.service_worker).toContain(".js");
    const contentScripts = build.manifest
      .content_scripts as CustomContentScript[];
    const ts = contentScripts[0].ts as string[];
    expect(ts[0]).toContain("test2-");
    expect(ts[0]).toContain(".js");
    expect(build.manifest.action?.default_popup).toContain("popup-");
    expect(build.manifest.action?.default_popup).toContain(".html");
    expect(build.manifest.options_page).toContain("optionsPage-");
    expect(build.manifest.options_page).toContain(".html");
    expect(build.manifest.options_ui?.page).toContain("optionsUI-");
    expect(build.manifest.options_ui?.page).toContain(".html");

    const popup = await Bun.file(
      resolve(
        build.config.outdir,
        build.manifest.action?.default_popup as string
      )
    ).text();
    expect(popup).toContain("chunk-");
    expect(popup).toContain(".js");
    const optionsPage = await Bun.file(
      resolve(build.config.outdir, build.manifest.options_page as string)
    ).text();
    expect(optionsPage).toContain("chunk-");
    expect(optionsPage).toContain(".js");
    const optionsUI = await Bun.file(
      resolve(build.config.outdir, build.manifest.options_ui?.page as string)
    ).text();
    expect(optionsUI).toContain("chunk-");
    expect(optionsUI).toContain(".js");
  });
});

describe("writeManifest", () => {
  beforeEach(async () => {
    spyOn(Bun, "write");
    build.config.public = resolve(cwd, "public");
    await rm(build.config.public, { recursive: true, force: true });
  });

  afterEach(async () => {
    mock.restore();
    await rm(build.config.public, { recursive: true, force: true });
  });

  test("test with minimal config", async () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
    });

    await build.writeManifest();

    expect(Bun.write).toHaveBeenCalledTimes(1);
    const manifest: FullManifest = await Bun.file(
      resolve(build.config.outdir, "manifest.json")
    ).json();
    expect(manifest.name).toBe("test");
    expect(manifest.version).toBe("0.0.1");
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
    await createTestPublicFolder(build.config.public, [
      "test/resources/icons/16.png",
    ]);
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      icons: {
        16: "public/icons/16.png",
      },
    });

    await build.preprocessManifest();
    await build.copyPublic();
    await build.writeManifest();

    const valuesArray = Array.from(build.fileToProperty.values());
    expect(valuesArray.includes("public/icons/16.png")).toBeTrue();
    expect(Bun.write).toHaveBeenCalledTimes(3);
    const manifest: FullManifest = await Bun.file(
      resolve(build.config.outdir, "manifest.json")
    ).json();
    const icons = manifest.icons as Icons;
    expect(icons["16"]).toBe("public/icons/16.png");
  });

  test("test with multiple ways of defining paths", async () => {
    build.cwd = cwd;
    await createTestPublicFolder(build.config.public, [
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

    const manifest: FullManifest = await Bun.file(
      resolve(build.config.outdir, "manifest.json")
    ).json();
    const icons = manifest.icons as Icons;
    expect(icons["16"]).toBe("public/icons/16.png");
    expect(icons["32"]).toBe("public/icons/32.png");
    expect(icons["48"]).toBe("public/icons/48.png");
    expect(icons["128"]).toBe("public/icons/128.png");
  });

  test("test with different public and out dir", async () => {
    build.cwd = cwd;
    build.config.public = resolve(cwd, "testPublic");
    build.config.outdir = resolve(cwd, "out");
    await createTestPublicFolder(build.config.public, [
      "test/resources/icons/16.png",
    ]);
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      icons: {
        16: "testPublic/icons/16.png",
      },
    });

    await build.preprocessManifest();
    await build.copyPublic();
    await build.writeManifest();

    const valuesArray = Array.from(build.fileToProperty.values());
    expect(valuesArray.includes("testPublic/icons/16.png")).toBeTrue();
    expect(Bun.write).toHaveBeenCalledTimes(3);

    const manifest: FullManifest = await Bun.file(
      resolve(build.config.outdir, "manifest.json")
    ).json();
    const icons = manifest.icons as Icons;
    expect(icons["16"]).toBe("testPublic/icons/16.png");
  });
});

describe("copyPublic", () => {
  beforeEach(async () => {
    spyOn(Bun, "write");
    spyOn(await import("fs/promises"), "readdir");
    build.config.public = resolve(cwd, "public");
    await rm(build.config.public, { recursive: true, force: true });
  });

  afterEach(async () => {
    mock.restore();
    await rm(build.config.public, { recursive: true, force: true });
  });

  test("test with no public dir", async () => {
    await build.copyPublic();

    expect(readdir).not.toHaveBeenCalled();
  });

  test("test with empty public dir", async () => {
    await mkdir(resolve(cwd, build.config.public));

    await build.copyPublic();

    expect(readdir).toHaveBeenCalledTimes(1);
    expect(Bun.write).not.toHaveBeenCalled();
  });

  test("test with file in public folder", async () => {
    build.cwd = cwd;
    await createTestPublicFolder(build.config.public, [
      "test/resources/icons/16.png",
    ]);

    await build.copyPublic();

    expect(readdir).toHaveBeenCalledTimes(1);
    expect(Bun.write).toHaveBeenCalledTimes(2);
    const files = await readdir(
      resolve(build.config.outdir, build.config.public),
      {
        recursive: true,
      }
    );
    expect(files.length).toBe(2); // icons also counts
  });
});

describe("parse", () => {
  beforeEach(async () => {
    spyOn(build, "preprocessManifest");
    spyOn(build, "parseManifest");
    spyOn(build, "copyPublic");
    spyOn(build, "writeManifest");
    build.config.public = resolve(cwd, "public");
    await rm(build.config.public, { recursive: true, force: true });
  });

  afterEach(async () => {
    mock.restore();
    await rm(build.config.public, { recursive: true, force: true });
  });

  test("test with no additional config", async () => {
    await build.parse();

    expect(build.preprocessManifest).toHaveBeenCalledTimes(1);
    expect(build.parseManifest).toHaveBeenCalledTimes(1);
    expect(build.copyPublic).toHaveBeenCalledTimes(1);
    expect(build.writeManifest).toHaveBeenCalledTimes(1);
    expect(build.fileToProperty).toBeEmpty();
  });

  test("test with manifest, but no public dir", async () => {
    const file1 = resolve(cwd, "test/resources/test1.ts");
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: file1,
      },
    });

    await build.parse();

    expect(build.preprocessManifest).toHaveBeenCalledTimes(1);
    expect(build.parseManifest).toHaveBeenCalledTimes(1);
    expect(build.copyPublic).toHaveBeenCalledTimes(1);
    expect(build.writeManifest).toHaveBeenCalledTimes(1);
    expect(build.fileToProperty.size).toBe(1);
    expect(build.fileToProperty.get(file1)).toContain(
      resolve(build.config.outdir, "test1-")
    );
    const manifest: FullManifest = await Bun.file(
      resolve(build.config.outdir, "manifest.json")
    ).json();
    expect(manifest.background?.service_worker).toContain("test1-");
    expect(manifest.background?.service_worker).toContain(".js");
  });

  test("test with manifest, but empty public dir", async () => {
    const file1 = resolve(cwd, "test/resources/test1.ts");
    await mkdir(build.config.public);
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: file1,
      },
    });

    await build.parse();

    expect(build.preprocessManifest).toHaveBeenCalledTimes(1);
    expect(build.parseManifest).toHaveBeenCalledTimes(1);
    expect(build.copyPublic).toHaveBeenCalledTimes(1);
    expect(build.writeManifest).toHaveBeenCalledTimes(1);
    expect(build.fileToProperty.size).toBe(1);
    expect(build.fileToProperty.get(file1)).toContain(
      resolve(build.config.outdir, "test1-")
    );
    const manifest: FullManifest = await Bun.file(
      resolve(build.config.outdir, "manifest.json")
    ).json();
    expect(manifest.background?.service_worker).toContain("test1-");
    expect(manifest.background?.service_worker).toContain(".js");
  });

  test("test with basic manifest and public folder", async () => {
    build.cwd = cwd;
    await createTestPublicFolder(build.config.public, [
      "test/resources/icons/16.png",
      "test/resources/icons/32.png",
      "test/resources/icons/48.png",
      "test/resources/icons/128.png",
    ]);
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
