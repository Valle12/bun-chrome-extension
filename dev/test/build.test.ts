import type { Serve, Server, ServerWebSocket } from "bun";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";
import type { FSWatcher } from "chokidar";
import * as chokidar from "chokidar";
import { mkdir, readdir, rm } from "fs/promises";
import * as path from "path";
import { join, relative, resolve } from "path";
import { stdin } from "process";
import { Build } from "../build";
import { exportRemover, sassCompiler } from "../plugins";
import type {
  CustomContentScript,
  FullManifest,
  Icons,
  WebSocketType,
} from "../types";
import { defineManifest } from "../types";

let build: Build;
let tsTest1: string;
let tsTest2: string;
let tsTest3: string;
let importExportTest: string;
let popupTest: string;
let popupWithImgTest: string;
let nestedPopupTest: string;
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
  importExportTest = build.posixPath(
    resolve(cwd, "test/resources/importExport.ts")
  );
  popupTest = build.posixPath(resolve(cwd, "test/resources/popup.html"));
  popupWithImgTest = build.posixPath(
    resolve(cwd, "test/resources/popup-with-img.html")
  );
  nestedPopupTest = resolve(cwd, "test/resources/src/nestedPopup.html");
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

    const paths: string[] = [];
    build.extractPaths();

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

    const paths: string[] = [];
    build.extractPaths(paths);

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

    const paths: string[] = [];
    build.extractPaths(paths);

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

    const paths: string[] = [];
    build.extractPaths(paths);

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

    const paths: string[] = [];
    build.extractPaths(paths);

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

    const paths: string[] = [];
    build.extractPaths(paths);

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

    const paths: string[] = [];
    build.extractPaths(paths);

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

    const paths: string[] = [];
    build.extractPaths(paths);

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

    const paths: string[] = [];
    build.extractPaths(paths);

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
      description:
        "Enables you to see solace messages directly in the browser.",
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

    const paths: string[] = [];
    build.extractPaths(paths);

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
  let publicFolder: string;

  beforeEach(() => {
    publicFolder = resolve(cwd, "public");
    spyOn(Bun, "build");
    spyOn(Bun, "write");
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
    expect(build.manifest.background?.type).toBeUndefined();
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
    expect(build.manifest.action?.default_popup).toBe("popup.html");
  });

  test("test with popup info with img tag", async () => {
    await createTestPublicFolder(publicFolder, ["test/resources/icons/16.png"]);
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      action: {
        default_popup: popupWithImgTest,
      },
      icons: {
        "16": img16,
      },
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [popupWithImgTest, img16],
      minify: build.config.minify,
      outdir: build.config.outdir,
      sourcemap: build.config.sourcemap,
      plugins: [exportRemover, sassCompiler],
    });

    const popupPath = resolve(
      build.config.outdir,
      build.manifest.action?.default_popup as string
    );
    const popup = await Bun.file(popupPath).text();
    const imgPath = popup.match(/<img src="([^"]+)"/)?.[1] as string;
    const resolved = resolve(popupPath, "..", imgPath);
    expect(await Bun.file(resolved).exists()).toBeTrue();

    const iconPath = build.manifest.icons?.[16] as string;
    const resolvedIcon = resolve(build.config.outdir, iconPath);
    expect(await Bun.file(resolvedIcon).exists()).toBeTrue();
  });

  test("test with relative nested popup info", async () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: tsTest1,
      },
      action: {
        default_popup: nestedPopupTest,
      },
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.build).toHaveBeenCalledWith({
      entrypoints: [tsTest1, build.posixPath(nestedPopupTest)],
      minify: build.config.minify,
      outdir: build.config.outdir,
      sourcemap: build.config.sourcemap,
      plugins: [exportRemover, sassCompiler],
    });
    expect(build.manifest.background?.service_worker).toBe("test1.js");
    expect(build.manifest.background?.type).toBe("module");
    expect(build.manifest.action?.default_popup).toBe("src/nestedPopup.html");
  });

  test("test with options_page info", async () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      options_page: optionsPageTest,
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
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
    expect(build.manifest.background?.service_worker).toBe("test1.js");
    expect(build.manifest.background?.type).toBe("module");
  });

  test("test with import export to be trimmed while building", async () => {
    process.chdir(resolve(import.meta.dir, "..", ".."));
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: importExportTest,
      },
    });
    build.config = {
      minify: false,
      outdir: resolve(cwd, "dist"),
      sourcemap: "none",
    };
    spyOn(console, "log").mockImplementation(() => {});

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(build.manifest.background?.service_worker).toBe("importExport.js");
    expect(build.manifest.background?.type).toBe("module");
    const exportFile = resolve(build.config.outdir, "importExport.js");
    const content = await Bun.file(exportFile).text();
    expect(content).toMatchSnapshot();

    await import(exportFile);

    expect(console.log).toHaveBeenCalledTimes(2);
    expect(console.log).toHaveBeenNthCalledWith(1, {
      manifest_version: 3,
      name: "Test",
      version: "0.0.1",
    });
    expect(console.log).toHaveBeenNthCalledWith(2, "test");
  });

  test("test with content_scripts info", async () => {
    const matches = [
      "http://google.com/*",
      "https://*.hello.world/cmd",
      "https://*/*",
      "<all_urls>",
    ];
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      content_scripts: [
        {
          ts: [tsTest1],
          matches,
        },
      ],
    });

    await build.parseManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    const contentScripts = build.manifest
      .content_scripts as CustomContentScriptTest[];
    const js = contentScripts[0].js as string[];
    expect(js[0]).toBe("test1.js");
    const matchesResult = contentScripts[0].matches as string[];
    expect(matchesResult).toEqual(matches);
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
    const contentScripts = build.manifest
      .content_scripts as CustomContentScriptTest[];
    const js = contentScripts[0].js as string[];
    expect(js[0]).toBe("test1.js");
    const js2 = contentScripts[1].js as string[];
    expect(js2[0]).toBe("test2.js");
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
    expect(build.manifest.action?.default_popup).toBe(
      "popup-with-stylesheet.html"
    );
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
    const contentScripts = build.manifest
      .content_scripts as CustomContentScriptTest[];
    const js = contentScripts[0].js as string[];
    expect(js[0]).toBe("test1.js");
    expect(js[1]).toBe("test2.js");
    expect(build.manifest.background?.service_worker).toBe("test1.js");
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
      sourcemap: build.config.sourcemap,
      plugins: [exportRemover, sassCompiler],
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
      sourcemap: build.config.sourcemap,
      plugins: [exportRemover, sassCompiler],
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

    const css = await Bun.file(
      resolve(
        build.config.outdir,
        popup.substring(popup.indexOf("./chunk-"), popup.indexOf(".css") + 4)
      )
    ).text();
    expect(css).toContain("prefers-color-scheme");

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

  test("test with entrypoint not found", async () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: tsTest1,
      },
    });
    spyOn(Array.prototype, "findIndex").mockReturnValue(-1);
    spyOn(console, "error").mockImplementation(() => {});

    await build.parseManifest();

    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      "Could not find entrypoint for output",
      [tsTest1],
      expect.anything()
    );
  });

  test("test with everything", async () => {
    const matches = ["https://google.com/*"];
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      description:
        "Enables you to see solace messages directly in the browser.",
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
          matches,
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
      sourcemap: build.config.sourcemap,
      plugins: [exportRemover, sassCompiler],
    });
    expect(build.manifest.background?.service_worker).toBe("test1.js");
    const contentScripts = build.manifest
      .content_scripts as CustomContentScriptTest[];
    const js = contentScripts[0].js as string[];
    expect(js[0]).toBe("test2.js");
    const css = contentScripts[0].css as string[];
    expect(css[0]).toBe("test1.css");
    const matchesResult = contentScripts[0].matches as string[];
    expect(matchesResult).toEqual(matches);
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
    const matches = ["https://www.youtube.com/watch?v=dQw4w9WgXcQ"];
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      content_scripts: [
        {
          ts: [tsTest1],
          matches,
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
    const matchesResult = contentScripts[0].matches as string[];
    expect(matchesResult).toEqual(matches);
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
    expect(Bun.write).toHaveBeenCalledTimes(2);
    const manifest: FullManifest = await Bun.file(
      resolve(build.config.outdir, "manifest.json")
    ).json();
    const icons = manifest.icons as Icons;
    expect(icons["16"]).toStartWith("16-");
    expect(icons["16"]).toEndWith(".png");
  });

  test("test with img tag in popup", async () => {
    build.cwd = cwd;
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      action: {
        default_popup: popupWithImgTest,
      },
    });

    await build.parseManifest();
    await build.writeManifest();

    expect(Bun.build).toHaveBeenCalledTimes(1);
    expect(Bun.write).toHaveBeenCalledTimes(1);
    const manifest: FullManifest = await Bun.file(
      resolve(build.config.outdir, "manifest.json")
    ).json();
    expect(manifest.action?.default_popup).toBe("popup-with-img.html");
    const popup = await Bun.file(
      resolve(build.config.outdir, "popup-with-img.html")
    ).text();
    expect(popup).toContain('src="./test-');
    expect(popup).toContain(".png");
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
      sourcemap: build.config.sourcemap,
      plugins: [exportRemover, sassCompiler],
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
      sourcemap: build.config.sourcemap,
      plugins: [exportRemover, sassCompiler],
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
    await testWrittenManifest();
  });

  test("test with manifest, but empty public dir", async () => {
    await mkdir(publicFolder);
    await testWrittenManifest();
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
  test("test from random path to relative posix", () => {
    const relativePath = build.relativePosixPath(
      build.config.outdir,
      build.posixPath(resolve(build.config.outdir, "test", "test"))
    );

    expect(relativePath).toBe("test/test");
  });

  test("test from posix to relative posix", () => {
    const relativePath = build.relativePosixPath(
      build.posixPath(build.config.outdir),
      build.posixPath(resolve(build.config.outdir, "test", "test"))
    );

    expect(relativePath).toBe("test/test");
  });
});

describe("posixPath", () => {
  test("test from random path to posix", () => {
    const posixPath = build.posixPath("test/test\\test");

    expect(posixPath).toBe("test/test/test");
  });

  test("test from posix to posix", () => {
    const posixPath = build.posixPath("test/test");

    expect(posixPath).toBe("test/test");
  });

  test("test with url", () => {
    const posixPath = build.posixPath("https://test/test");

    expect(posixPath).toBe("https://test/test");
  });
});

describe("setServiceWorker", () => {
  beforeEach(() => {
    spyOn(console, "log").mockImplementation(() => {});
    spyOn(Bun, "write");
    spyOn(Bun, "file");
  });

  afterEach(async () => {
    mock.restore();
    await rm(resolve(build.cwd, "compose.ts"), {
      recursive: true,
      force: true,
    });
  });

  test("test with no background info, so creating connection and keepAlive as background info", async () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
    });

    await build.setServiceWorker();

    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith(
      "No background service worker found, creating one..."
    );
    expect(Bun.file).toHaveBeenCalledTimes(1);
    expect(Bun.file).toHaveBeenCalledWith(resolve(cwd, "composeTemplate.ts"));
    const compose = resolve(build.cwd, "compose.ts");
    expect(Bun.write).toHaveBeenCalledTimes(1);
    expect(Bun.write).toHaveBeenCalledWith(compose, expect.anything());
    expect(build.manifest.background).toEqual({
      service_worker: compose,
      type: "module",
    });

    const content = await Bun.file(compose).text();
    expect(content).toMatchSnapshot();
  });

  test("test with invalid service_worker, so creating connection and keepAlive as background info", async () => {
    build.originalServiceWorker = "test";
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: "test",
      },
    });

    await build.setServiceWorker();

    expect(Bun.file).toHaveBeenCalledTimes(2);
    expect(Bun.file).toHaveBeenNthCalledWith(1, resolve(build.cwd, "test"));
    expect(Bun.file).toHaveBeenNthCalledWith(
      2,
      resolve(cwd, "composeTemplate.ts")
    );
    expect(build.manifest.background).toEqual({
      service_worker: resolve(build.cwd, "compose.ts"),
      type: "module",
    });
  });

  test("test with service_worker, pointing to an existing file, creating compose", async () => {
    spyOn(build, "relativePosixPath");

    build.originalServiceWorker = tsTest1;
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: tsTest1,
      },
    });

    await build.setServiceWorker();

    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith(
      "Background service worker found, creating compose..."
    );
    expect(build.relativePosixPath).toHaveBeenCalledTimes(1);
    expect(build.relativePosixPath).toHaveBeenCalledWith(build.cwd, tsTest1);
    const compose = resolve(build.cwd, "compose.ts");
    expect(Bun.write).toHaveBeenCalledTimes(1);
    expect(Bun.write).toHaveBeenCalledWith(compose, expect.any(String));
    expect(build.manifest.background).toEqual({
      service_worker: compose,
      type: "module",
    });

    const content = await Bun.file(compose).text();
    expect(content).toMatchSnapshot();
  });
});

describe("startServer", () => {
  let capturedOptions = {} as Serve<WebSocketType>;

  beforeEach(() => {
    spyOn(Bun, "serve").mockImplementation(options => {
      capturedOptions = options as Serve<WebSocketType>;
      return {} as any;
    });
  });

  afterEach(() => {
    mock.restore();
  });

  test("test fetch with unsuccessful upgrade", async () => {
    const reqMock = {} as Request;
    const serverMock = {
      upgrade: mock(() => false),
    } as unknown as Server;

    build.startServer();

    const response = capturedOptions.fetch.call(
      serverMock,
      reqMock,
      serverMock
    ) as Response;
    expect(serverMock.upgrade).toHaveBeenCalledTimes(1);
    expect(await response.text()).toBe("Upgrade failed!");
    expect(response.status).toBe(500);
  });

  test("test fetch with successful upgrade", () => {
    const reqMock = {} as Request;
    const serverMock = {
      upgrade: mock(() => true),
    } as unknown as Server;

    build.startServer();

    const response = capturedOptions.fetch.call(
      serverMock,
      reqMock,
      serverMock
    );
    expect(serverMock.upgrade).toHaveBeenCalledTimes(1);
    expect(typeof response).toBe("undefined");
  });
});

describe("openWebsocket", () => {
  let ws: ServerWebSocket<WebSocketType>;

  beforeEach(() => {
    ws = {
      send: mock(() => {}),
    } as unknown as ServerWebSocket<WebSocketType>;
    spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    mock.restore();
  });

  test("test on first connection", () => {
    expect(build.firstConnect).toBeTrue();

    build.openWebsocket(ws);

    expect(build.ws).toEqual(ws);
    expect(build.firstConnect).toBeFalse();
    expect(ws.send).toHaveBeenCalledTimes(1);
    expect(ws.send).toHaveBeenCalledWith("reload");
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith("Connection established!");
  });

  test("test on second connection", () => {
    build.firstConnect = false;
    build.openWebsocket(ws);

    expect(build.ws).toEqual(ws);
    expect(build.firstConnect).toBeFalse();
    expect(ws.send).toHaveBeenCalledTimes(0);
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith("Connection established!");
  });
});

describe("initDev", () => {
  let listener: Function;
  let options: chokidar.Matcher;

  beforeEach(() => {
    spyOn(build, "setServiceWorker").mockReturnValue(Promise.resolve());
    spyOn(build, "startServer").mockImplementation(() => {});
    spyOn(console, "log").mockImplementation(() => {});
    spyOn(chokidar, "watch").mockImplementation((_paths, opts) => {
      if (opts) options = opts.ignored as chokidar.Matcher;
      return {
        on: (_event: keyof chokidar.FSWatcherKnownEventMap, cb: Function) => {
          listener = cb;
        },
        close: mock(),
      } as unknown as FSWatcher;
    });
  });

  afterEach(() => {
    mock.restore();
  });

  test("test ignored method in watch options", async () => {
    await build.initDev();

    expect(typeof options === "function" ? options(".git") : false).toBeTrue();
    expect(typeof options === "function" ? options("test") : true).toBeFalse();
  });

  test("test with updated file", async () => {
    const manifest = resolve(import.meta.dir, "resources/manifest.ts");
    build.ws = {
      send: mock(),
    } as unknown as ServerWebSocket<WebSocketType>;

    spyOn(console, "clear").mockImplementation(() => {});
    spyOn(build, "parse").mockReturnValue(Promise.resolve());
    spyOn(path, "resolve").mockReturnValue(manifest);

    await build.initDev();
    await listener("all", tsTest1);

    expect(console.clear).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith("Rebuild project...");
    expect(build.setServiceWorker).toHaveBeenCalledTimes(2);
    expect(build.parse).toHaveBeenCalledTimes(1);
    expect(build.ws.send).toHaveBeenCalledTimes(1);
    expect(build.ws.send).toHaveBeenCalledWith("reload");
  });

  test("test with unrelated keys", async () => {
    const spy = spyOn(stdin, "on");

    await build.initDev();

    const cb: (data: Buffer) => void = spy.mock.calls[0][1];
    cb(Buffer.from("\u0004"));

    expect(console.log).toHaveBeenCalledTimes(0);
  });

  test("test if shutdown runs", async () => {
    const spy = spyOn(stdin, "on");
    spyOn(process, "exit").mockImplementation(() => undefined as never);

    await build.initDev();

    const cb: (data: Buffer) => void = spy.mock.calls[0][1];
    cb(Buffer.from("\u0003"));

    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith("Closing watcher...");
    expect(process.exit).toHaveBeenCalledTimes(1);
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

async function testWrittenManifest() {
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
}
