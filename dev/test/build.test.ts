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
import type { CustomContentScript, FullManifest, Icons } from "../types";
import { defineManifest } from "../types";

let build: Build;
let tsTest1: string;
let tsTest2: string;
let tsTest3: string;
let popupTest: string;
let popupWithStylesheetTest: string;
let optionsPageTest: string;
let optionsPageWithStylesheetTest: string;
let optionsUiTest: string;
let optionsUiWithStylesheetTest: string;
let cssTest1: string;
let img16: string;
let img32: string;
let img48: string;
let img128: string;
const cwd = resolve(import.meta.dir, "..");

type CustomContentScriptTest = CustomContentScript & {
  js: string[];
};

beforeEach(async () => {
  build = new Build({
    manifest_version: 3,
    name: "test",
    version: "0.0.1",
  });
  build.config.outdir = resolve(cwd, "dist");
  tsTest1 = build.posixPath(resolve(cwd, "test/resources/test1.ts"));
  tsTest2 = build.posixPath(resolve(cwd, "test/resources/test2.ts"));
  tsTest3 = build.posixPath(resolve(cwd, "test/resources/test3.ts"));
  popupTest = build.posixPath(resolve(cwd, "test/resources/popup.html"));
  popupWithStylesheetTest = build.posixPath(
    resolve(cwd, "test/resources/popup-with-stylesheet.html")
  );
  optionsPageTest = build.posixPath(
    resolve(cwd, "test/resources/optionsPage.html")
  );
  optionsPageWithStylesheetTest = build.posixPath(
    resolve(cwd, "test/resources/optionsPage-with-stylesheet.html")
  );
  optionsUiTest = build.posixPath(
    resolve(cwd, "test/resources/optionsUI.html")
  );
  optionsUiWithStylesheetTest = build.posixPath(
    resolve(cwd, "test/resources/optionsUI-with-stylesheet.html")
  );
  cssTest1 = build.posixPath(resolve(cwd, "test/resources/test1.css"));
  img16 = build.posixPath(resolve(cwd, "public/icons/16.png"));
  img32 = build.posixPath(resolve(cwd, "public\\icons\\32.png"));
  img48 = build.posixPath(resolve(cwd, "public/icons\\48.png"));
  img128 = build.posixPath(resolve(cwd, "public") + "/icons/128.png");
  await rm(build.config.outdir, { recursive: true, force: true });
});

afterEach(async () => {
  await rm(build.config.outdir, { recursive: true, force: true });
});

describe("extractPaths", () => {
  test("test with no additional config", () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
    });

    const paths = build.extractPaths();

    expect(paths).toBeEmpty();
  });

  test("test with background info", () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: "test1.ts",
      },
    });

    const paths = build.extractPaths();

    expect(paths.length).toBe(1);
    const file = build.posixPath(resolve("test1.ts"));
    expect(paths[0]).toBe(file);
    expect(build.manifest.background?.service_worker).toBe(file);
  });

  test("test with content_scripts info", () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      content_scripts: [
        {
          ts: ["test1.ts"],
        },
      ],
    });

    const paths = build.extractPaths();

    expect(paths.length).toBe(1);
    const file = build.posixPath(resolve("test1.ts"));
    expect(paths[0]).toBe(file);
    const contentScripts = build.manifest
      .content_scripts as CustomContentScriptTest[];
    const js = contentScripts[0].js as string[];
    expect(js[0]).toBe(file);
  });

  test("test with popup info", () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      action: {
        default_popup: "popup.html",
      },
    });

    const paths = build.extractPaths();

    expect(paths.length).toBe(1);
    const file = build.posixPath(resolve("popup.html"));
    expect(paths[0]).toBe(file);
    expect(build.manifest.action?.default_popup).toBe(file);
  });

  test("test with options_page info", () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      options_page: "optionsPage.html",
    });

    const paths = build.extractPaths();

    expect(paths.length).toBe(1);
    const file = build.posixPath(resolve("optionsPage.html"));
    expect(paths[0]).toBe(file);
    expect(build.manifest.options_page).toBe(file);
  });

  test("test with options_ui.page info", () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      options_ui: {
        page: "optionsUI.html",
      },
    });

    const paths = build.extractPaths();

    expect(paths.length).toBe(1);
    const file = build.posixPath(resolve("optionsUI.html"));
    expect(paths[0]).toBe(file);
    expect(build.manifest.options_ui?.page).toBe(file);
  });

  test("test with background and content_scripts info", () => {
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

    const paths = build.extractPaths();

    expect(paths.length).toBe(2);
    const file1 = build.posixPath(resolve("src/test1.ts"));
    expect(paths[0]).toBe(file1);
    const file2 = build.posixPath(resolve("test2.ts"));
    expect(paths[1]).toBe(file2);
    expect(build.manifest.background?.service_worker).toBe(file1);
    const contentScripts = build.manifest
      .content_scripts as CustomContentScriptTest[];
    const js = contentScripts[0].js as string[];
    expect(js[0]).toBe(file2);
  });

  test("test with multiple ts files", () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      content_scripts: [
        {
          ts: ["test1.ts", "src/test2.ts"],
        },
      ],
    });

    const paths = build.extractPaths();

    expect(paths.length).toBe(2);
    const file1 = build.posixPath(resolve("test1.ts"));
    expect(paths[0]).toBe(file1);
    const file2 = build.posixPath(resolve("src/test2.ts"));
    expect(paths[1]).toBe(file2);
    const contentScripts = build.manifest
      .content_scripts as CustomContentScriptTest[];
    const js = contentScripts[0].js as string[];
    expect(js[0]).toBe(file1);
    expect(js[1]).toBe(file2);
  });

  test("test with multiple content_scripts", () => {
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

    const paths = build.extractPaths();

    expect(paths.length).toBe(2);
    const file1 = build.posixPath(resolve("test1.ts"));
    expect(paths[0]).toBe(file1);
    const file2 = build.posixPath(resolve("test2.ts"));
    expect(paths[1]).toBe(file2);
    const contentScripts = build.manifest
      .content_scripts as CustomContentScriptTest[];
    const js = contentScripts[0].js as string[];
    expect(js[0]).toBe(file1);
    const js2 = contentScripts[1].js as string[];
    expect(js2[0]).toBe(file2);
  });

  test("test with everything", () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      content_scripts: [
        {
          ts: ["test1.ts"],
        },
        {
          ts: ["test2.ts", "test3.ts"],
        },
      ],
      background: {
        service_worker: "src/test1.ts",
      },
      action: {
        default_popup: "popup-with-stylesheet.html",
      },
      options_page: "optionsPage.html",
      options_ui: {
        page: "optionsUI.html",
      },
    });

    const paths = build.extractPaths();

    expect(paths.length).toBe(7);
    const file0 = build.posixPath(resolve("test1.ts"));
    expect(paths[0]).toBe(file0);
    const file1 = build.posixPath(resolve("test2.ts"));
    expect(paths[1]).toBe(file1);
    const file2 = build.posixPath(resolve("test3.ts"));
    expect(paths[2]).toBe(file2);
    const file3 = build.posixPath(resolve("src/test1.ts"));
    expect(paths[3]).toBe(file3);
    const file4 = build.posixPath(resolve("popup-with-stylesheet.html"));
    expect(paths[4]).toBe(file4);
    const file5 = build.posixPath(resolve("optionsPage.html"));
    expect(paths[5]).toBe(file5);
    const file6 = build.posixPath(resolve("optionsUI.html"));
    expect(paths[6]).toBe(file6);
    expect(build.manifest.background?.service_worker).toBe(file3);
    const contentScripts = build.manifest
      .content_scripts as CustomContentScriptTest[];
    const js = contentScripts[0].js as string[];
    expect(js[0]).toBe(file0);
    const js2 = contentScripts[1].js as string[];
    expect(js2[0]).toBe(file1);
    expect(js2[1]).toBe(file2);
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
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      action: {
        default_popup: popupTest,
      },
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [popupTest],
      minify: build.config.minify,
      outdir: build.config.outdir,
      naming: "[dir]/[name].[ext]",
    });
    expect(build.manifest.action?.default_popup).toBe("popup.html");
  });

  test("test with options_page info", async () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      options_page: optionsPageTest,
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [optionsPageTest],
      minify: build.config.minify,
      outdir: build.config.outdir,
      naming: "[dir]/[name].[ext]",
    });
    expect(build.manifest.options_page).toBe("optionsPage.html");
  });

  test("test with options_ui info", async () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      options_ui: {
        page: optionsUiTest,
      },
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [optionsUiTest],
      minify: build.config.minify,
      outdir: build.config.outdir,
      naming: "[dir]/[name].[ext]",
    });
    expect(build.manifest.options_ui?.page).toBe("optionsUI.html");
  });

  test("test with background info", async () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: tsTest1,
      },
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [tsTest1],
      minify: build.config.minify,
      outdir: build.config.outdir,
      naming: "[dir]/[name].[ext]",
    });
    expect(build.manifest.background?.service_worker).toBe("test1.js");
  });

  test("test with content_scripts info", async () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      content_scripts: [
        {
          ts: [tsTest1],
        },
      ],
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [tsTest1],
      minify: build.config.minify,
      outdir: build.config.outdir,
      naming: "[dir]/[name].[ext]",
    });
    const contentScripts = build.manifest
      .content_scripts as CustomContentScriptTest[];
    const js = contentScripts[0].js as string[];
    expect(js[0]).toBe("test1.js");
  });

  test("test with background and content_scripts info", async () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: tsTest1,
      },
      content_scripts: [
        {
          ts: [tsTest2],
        },
      ],
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [tsTest1, tsTest2],
      minify: build.config.minify,
      outdir: build.config.outdir,
      naming: "[dir]/[name].[ext]",
    });
    expect(build.manifest.background?.service_worker).toBe("test1.js");
    const contentScripts = build.manifest
      .content_scripts as CustomContentScriptTest[];
    const js = contentScripts[0].js as string[];
    expect(js[0]).toBe("test2.js");
  });

  test("test with multiple ts files", async () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      content_scripts: [
        {
          ts: [tsTest1, tsTest2],
        },
      ],
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [tsTest1, tsTest2],
      minify: build.config.minify,
      outdir: build.config.outdir,
      naming: "[dir]/[name].[ext]",
    });
    const contentScripts = build.manifest
      .content_scripts as CustomContentScriptTest[];
    const js = contentScripts[0].js as string[];
    expect(js[0]).toBe("test1.js");
    expect(js[1]).toBe("test2.js");
  });

  test("test with multiple content_scripts", async () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      content_scripts: [
        {
          ts: [tsTest1],
        },
        {
          ts: [tsTest2],
        },
      ],
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [tsTest1, tsTest2],
      minify: build.config.minify,
      outdir: build.config.outdir,
      naming: "[dir]/[name].[ext]",
    });
    const contentScripts = build.manifest
      .content_scripts as CustomContentScriptTest[];
    const js = contentScripts[0].js as string[];
    expect(js[0]).toBe("test1.js");
    const js2 = contentScripts[1].js as string[];
    expect(js2[0]).toBe("test2.js");
  });

  test("test with popup info", async () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      action: {
        default_popup: popupTest,
      },
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [popupTest],
      minify: build.config.minify,
      outdir: build.config.outdir,
      naming: "[dir]/[name].[ext]",
    });
    expect(build.manifest.action?.default_popup).toBe("popup.html");
  });

  test("test with popup with script and link tags", async () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      action: {
        default_popup: popupWithStylesheetTest,
      },
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [popupWithStylesheetTest],
      minify: build.config.minify,
      outdir: build.config.outdir,
      naming: "[dir]/[name].[ext]",
    });
    expect(build.manifest.action?.default_popup).toBe(
      "popup-with-stylesheet.html"
    );
  });

  test("test with options_page info", async () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      options_page: optionsPageTest,
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [optionsPageTest],
      minify: build.config.minify,
      outdir: build.config.outdir,
      naming: "[dir]/[name].[ext]",
    });
    expect(build.manifest.options_page).toBe("optionsPage.html");
  });

  test("test with options_ui info", async () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      options_ui: {
        page: optionsUiTest,
      },
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [optionsUiTest],
      minify: build.config.minify,
      outdir: build.config.outdir,
      naming: "[dir]/[name].[ext]",
    });
    expect(build.manifest.options_ui?.page).toBe("optionsUI.html");
  });

  test("test two properties pointing to the same file", async () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: tsTest1,
      },
      content_scripts: [
        {
          ts: [tsTest1],
        },
      ],
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [tsTest1, tsTest1],
      minify: build.config.minify,
      outdir: build.config.outdir,
      naming: "[dir]/[name].[ext]",
    });
    expect(build.manifest.background?.service_worker).toBe("test1.js");
    const contentScripts = build.manifest
      .content_scripts as CustomContentScriptTest[];
    const js = contentScripts[0].js as string[];
    expect(js[0]).toBe("test1.js");
  });

  test("test two properties pointing to the same file and multiple ts files", async () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: tsTest1,
      },
      content_scripts: [
        {
          ts: [tsTest1, tsTest2],
        },
      ],
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [tsTest1, tsTest1, tsTest2],
      minify: build.config.minify,
      outdir: build.config.outdir,
      naming: "[dir]/[name].[ext]",
    });
    expect(build.manifest.background?.service_worker).toBe("test1.js");
    const contentScripts = build.manifest
      .content_scripts as CustomContentScriptTest[];
    const js = contentScripts[0].js as string[];
    expect(js[0]).toBe("test1.js");
    expect(js[1]).toBe("test2.js");
  });

  test("test two properties pointing to the same file and multiple content_scripts", async () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: tsTest1,
      },
      content_scripts: [
        {
          ts: [tsTest1],
        },
        {
          ts: [tsTest2],
        },
      ],
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [tsTest1, tsTest1, tsTest2],
      minify: build.config.minify,
      outdir: build.config.outdir,
      naming: "[dir]/[name].[ext]",
    });
    expect(build.manifest.background?.service_worker).toBe("test1.js");
    const contentScripts = build.manifest
      .content_scripts as CustomContentScriptTest[];
    const js = contentScripts[0].js as string[];
    expect(js[0]).toBe("test1.js");
    const js2 = contentScripts[1].js as string[];
    expect(js2[0]).toBe("test2.js");
  });

  test("test with 5 entries while the ts files point to the same file", async () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: tsTest1,
      },
      content_scripts: [
        {
          ts: [tsTest2, tsTest3],
        },
        {
          ts: [tsTest3, tsTest2],
        },
      ],
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [tsTest1, tsTest2, tsTest3, tsTest3, tsTest2],
      minify: build.config.minify,
      outdir: build.config.outdir,
      naming: "[dir]/[name].[ext]",
    });
    expect(build.manifest.background?.service_worker).toBe("test1.js");
    const contentScripts = build.manifest
      .content_scripts as CustomContentScriptTest[];
    const js = contentScripts[0].js as string[];
    expect(js[0]).toBe("test2.js");
    expect(js[1]).toBe("test3.js");
    const js2 = contentScripts[1].js as string[];
    expect(js2[0]).toBe("test3.js");
    expect(js2[1]).toBe("test2.js");
  });

  test("test with multiple html files, that contain multiple css files", async () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      action: {
        default_popup: popupWithStylesheetTest,
      },
      options_page: optionsPageWithStylesheetTest,
      options_ui: {
        page: optionsUiWithStylesheetTest,
      },
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [
        popupWithStylesheetTest,
        optionsPageWithStylesheetTest,
        optionsUiWithStylesheetTest,
      ],
      minify: build.config.minify,
      outdir: build.config.outdir,
      naming: "[dir]/[name].[ext]",
    });
    expect(build.manifest.action?.default_popup).toBe(
      "popup-with-stylesheet.html"
    );
    expect(build.manifest.options_page).toBe(
      "optionsPage-with-stylesheet.html"
    );
    expect(build.manifest.options_ui?.page).toBe(
      "optionsUI-with-stylesheet.html"
    );

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
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: tsTest1,
      },
      action: {
        default_popup: popupTest,
      },
      options_page: optionsPageTest,
      options_ui: {
        page: optionsUiTest,
      },
      content_scripts: [
        {
          ts: [tsTest2],
          css: [cssTest1],
        },
      ],
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [
        tsTest1,
        popupTest,
        optionsPageTest,
        optionsUiTest,
        tsTest2,
        cssTest1,
      ],
      minify: build.config.minify,
      outdir: build.config.outdir,
      naming: "[dir]/[name].[ext]",
    });
    expect(build.manifest.background?.service_worker).toBe("test1.js");
    const contentScripts = build.manifest
      .content_scripts as CustomContentScriptTest[];
    const js = contentScripts[0].js as string[];
    expect(js[0]).toBe("test2.js");
    const css = contentScripts[0].css as string[];
    expect(css[0]).toBe("test1.css");
    expect(build.manifest.action?.default_popup).toBe("popup.html");
    expect(build.manifest.options_page).toBe("optionsPage.html");
    expect(build.manifest.options_ui?.page).toBe("optionsUI.html");

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
  let publicFolder: string;

  beforeEach(async () => {
    spyOn(Bun, "write");
    spyOn(Bun, "build");
    publicFolder = resolve(cwd, "public");
    await rm(publicFolder, { recursive: true, force: true });
  });

  afterEach(async () => {
    mock.restore();
    await rm(publicFolder, { recursive: true, force: true });
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
          ts: [tsTest1],
        },
      ],
    });

    await build.parseManifest();
    await build.writeManifest();

    expect(Bun.write).toHaveBeenCalledTimes(1);
    const manifest: FullManifest = await Bun.file(
      resolve(build.config.outdir, "manifest.json")
    ).json();
    const contentScripts =
      manifest.content_scripts as CustomContentScriptTest[];
    const js = contentScripts[0].js as string[];
    expect(js[0]).toBe("test1.js");
  });

  test("test with png in public folder", async () => {
    build.cwd = cwd;
    await createTestPublicFolder(publicFolder, ["test/resources/icons/16.png"]);
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      icons: {
        16: img16,
      },
    });

    await build.parseManifest();
    await build.writeManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [img16],
      minify: build.config.minify,
      outdir: build.config.outdir,
      naming: "[dir]/[name].[ext]",
    });
    expect(Bun.write).toHaveBeenCalledTimes(2);
    const manifest: FullManifest = await Bun.file(
      resolve(build.config.outdir, "manifest.json")
    ).json();
    const icons = manifest.icons as Icons;
    expect(icons["16"]).toStartWith("16-");
    expect(icons["16"]).toEndWith(".png");
  });

  test("test with multiple ways of defining paths", async () => {
    build.cwd = cwd;
    await createTestPublicFolder(publicFolder, [
      "test/resources/icons/16.png",
      "test/resources/icons/32.png",
      "test/resources/icons/48.png",
      "test/resources/icons/128.png",
    ]);
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      icons: {
        16: img16,
        32: img32,
        48: img48,
        128: img128,
      },
    });

    await build.parseManifest();
    await build.writeManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [img16, img32, img48, img128],
      minify: build.config.minify,
      outdir: build.config.outdir,
      naming: "[dir]/[name].[ext]",
    });
    expect(Bun.write).toHaveBeenCalledTimes(5);
    const manifest: FullManifest = await Bun.file(
      resolve(build.config.outdir, "manifest.json")
    ).json();
    const icons = manifest.icons as Icons;
    expect(icons["16"]).toStartWith("16-");
    expect(icons["16"]).toEndWith(".png");
    expect(icons["32"]).toStartWith("32-");
    expect(icons["32"]).toEndWith(".png");
    expect(icons["48"]).toStartWith("48-");
    expect(icons["48"]).toEndWith(".png");
    expect(icons["128"]).toStartWith("128-");
    expect(icons["128"]).toEndWith(".png");
  });

  test("test with different public and out dir", async () => {
    build.cwd = cwd;
    publicFolder = resolve(cwd, "testPublic");
    build.config.outdir = resolve(cwd, "out");
    const testImg16 = build.posixPath(resolve(cwd, "testPublic/icons/16.png"));
    await createTestPublicFolder(publicFolder, ["test/resources/icons/16.png"]);
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      icons: {
        16: testImg16,
      },
    });

    await build.parseManifest();
    await build.writeManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [testImg16],
      minify: build.config.minify,
      outdir: build.config.outdir,
      naming: "[dir]/[name].[ext]",
    });
    expect(Bun.write).toHaveBeenCalledTimes(2);
    const manifest: FullManifest = await Bun.file(
      resolve(build.config.outdir, "manifest.json")
    ).json();
    const icons = manifest.icons as Icons;
    expect(icons["16"]).toStartWith("16-");
    expect(icons["16"]).toEndWith(".png");
  });
});

describe("parse", () => {
  const publicFolder = resolve(cwd, "public");

  beforeEach(async () => {
    spyOn(build, "parseManifest");
    spyOn(build, "writeManifest");
    await rm(publicFolder, { recursive: true, force: true });
  });

  afterEach(async () => {
    mock.restore();
    await rm(publicFolder, { recursive: true, force: true });
  });

  test("test with no additional config", async () => {
    await build.parse();

    expect(build.parseManifest).toHaveBeenCalledTimes(1);
    expect(build.writeManifest).toHaveBeenCalledTimes(1);
  });

  test("test with manifest, but no public dir", async () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: tsTest1,
      },
    });

    await build.parse();

    expect(build.parseManifest).toHaveBeenCalledTimes(1);
    expect(build.writeManifest).toHaveBeenCalledTimes(1);
    const manifest: FullManifest = await Bun.file(
      resolve(build.config.outdir, "manifest.json")
    ).json();
    expect(manifest.background?.service_worker).toBe("test1.js");
  });

  test("test with manifest, but empty public dir", async () => {
    await mkdir(publicFolder);
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: tsTest1,
      },
    });

    await build.parse();

    expect(build.parseManifest).toHaveBeenCalledTimes(1);
    expect(build.writeManifest).toHaveBeenCalledTimes(1);
    const manifest: FullManifest = await Bun.file(
      resolve(build.config.outdir, "manifest.json")
    ).json();
    expect(manifest.background?.service_worker).toBe("test1.js");
  });

  test("test with basic manifest and public folder", async () => {
    build.cwd = cwd;
    await createTestPublicFolder(publicFolder, [
      "test/resources/icons/16.png",
      "test/resources/icons/32.png",
      "test/resources/icons/48.png",
      "test/resources/icons/128.png",
    ]);
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      icons: {
        16: img16,
        32: img32,
        48: img48,
        128: img128,
      },
    });

    await build.parse();

    expect(build.parseManifest).toHaveBeenCalledTimes(1);
    expect(build.writeManifest).toHaveBeenCalledTimes(1);
    const files = await readdir(build.config.outdir, { recursive: true });
    expect(files.length).toBe(9);
  });
});

describe("relativePosixPath", () => {
  test("test from random path to posix", () => {
    const relativePath = build.relativePosixPath(
      build.config.outdir,
      build.posixPath(resolve(build.config.outdir, "test", "test"))
    );

    expect(relativePath).toBe("test/test");
  });

  test("test from posix to posix", () => {
    const relativePath = build.relativePosixPath(
      build.posixPath(build.config.outdir),
      build.posixPath(resolve(build.config.outdir, "test", "test"))
    );

    expect(relativePath).toBe("test/test");
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
