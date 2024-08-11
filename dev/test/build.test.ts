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
import { resolve, sep } from "path";
import { Build } from "../build";
import { defineManifest } from "../manifest.config";
import type { Properties } from "../types";

let build: Build;
const cwd = resolve(import.meta.dir, "..");

beforeEach(async () => {
  build = new Build({});
  build.dist = resolve(cwd, "dist");
  await rm(build.dist, { recursive: true });
});

describe("extractPaths", () => {
  test("test with no additional config", () => {
    const properties: Properties = {};
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
    });

    const paths = build.extractPaths(properties);

    expect(properties).toEqual({});
    expect(paths.length).toBe(0);
  });

  test("test with background info", () => {
    const properties: Properties = {};
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      background: {
        service_worker: "test1.ts",
      },
    });

    const paths = build.extractPaths(properties);

    expect(properties["background.service_worker"]).toBeTrue();
    expect(properties["content_scripts.ts"]).toBeUndefined();
    expect(paths.length).toBe(1);
    expect(paths[0]).toBe(resolve("test1.ts"));
  });

  test("test with content_scripts info", () => {
    const properties: Properties = {};
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

    expect(properties["background.service_worker"]).toBeUndefined();
    expect(properties["content_scripts.ts"]).toBeTrue();
    expect(paths.length).toBe(1);
    expect(paths[0]).toBe(resolve("test1.ts"));
  });

  test("test with background and content_scripts info", () => {
    const properties: Properties = {};
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
      ],
    });

    const paths = build.extractPaths(properties);

    expect(properties["background.service_worker"]).toBeTrue();
    expect(properties["content_scripts.ts"]).toBeTrue();
    expect(paths.length).toBe(2);
    expect(paths[0]).toBe(resolve("src/test1.ts"));
    expect(paths[1]).toBe(resolve("test1.ts"));
  });

  test("test with multiple ts files", () => {
    const properties: Properties = {};
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

    expect(properties["background.service_worker"]).toBeUndefined();
    expect(properties["content_scripts.ts"]).toBeTrue();
    expect(paths.length).toBe(2);
    expect(paths[0]).toBe(resolve("test1.ts"));
    expect(paths[1]).toBe(resolve("src/test2.ts"));
  });

  test("test with multiple content_scripts", () => {
    const properties: Properties = {};
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

    expect(properties["background.service_worker"]).toBeUndefined();
    expect(properties["content_scripts.ts"]).toBeTrue();
    expect(paths.length).toBe(2);
    expect(paths[0]).toBe(resolve("test1.ts"));
    expect(paths[1]).toBe(resolve("test2.ts"));
  });

  test("test with everything", () => {
    const properties: Properties = {};
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

    expect(properties["background.service_worker"]).toBeTrue();
    expect(properties["content_scripts.ts"]).toBeTrue();
    expect(paths.length).toBe(4);
    expect(paths[0]).toBe(resolve("src/test1.ts"));
    expect(paths[1]).toBe(resolve("test1.ts"));
    expect(paths[2]).toBe(resolve("test2.ts"));
    expect(paths[3]).toBe(resolve("test3.ts"));
  });
});

describe("extractPathsFromHTML", () => {
  test("test with no additional config", async () => {
    const properties: Properties = {};
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
    });

    const htmlTypes = await build.extractPathsFromHTML(properties);

    expect(properties).toEqual({});
    expect(htmlTypes.length).toBe(0);
  });

  test("test with popup info", async () => {
    const properties: Properties = {};
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      action: {
        default_popup: resolve(cwd, "test/resources/popup.html"),
      },
    });

    const htmlTypes = await build.extractPathsFromHTML(properties);

    expect(properties["action.default_popup"]).toBeTrue();
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
    const properties: Properties = {};
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      options_page: resolve(cwd, "test/resources/optionsPage.html"),
    });

    const htmlTypes = await build.extractPathsFromHTML(properties);

    expect(properties["options_page"]).toBeTrue();
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
    const properties: Properties = {};
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      options_ui: {
        page: resolve(cwd, "test/resources/optionsUI.html"),
      },
    });

    const htmlTypes = await build.extractPathsFromHTML(properties);

    expect(properties["options_ui.page"]).toBeTrue();
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
    const properties: Properties = {};
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

    expect(properties["action.default_popup"]).toBeTrue();
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

    expect(properties["options_page"]).toBeTrue();
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

    expect(properties["options_ui.page"]).toBeTrue();
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
    const properties: Properties = {};
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      action: {
        default_popup: resolve(cwd, "test/resources/multiple.html"),
      },
    });

    const htmlTypes = await build.extractPathsFromHTML(properties);

    expect(properties["action.default_popup"]).toBeTrue();
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

    const properties: Properties = {};
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
      action: {
        default_popup: tmp,
      },
    });

    const htmlTypes = await build.extractPathsFromHTML(properties);

    expect(properties["action.default_popup"]).toBeTrue();
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
    expect(build.manifest.background.service_worker).toBe(
      resolve(build.dist, "test1.js")
    );
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
    expect(ts[0]).toBe(resolve(build.dist, "test1.js"));
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
    expect(build.manifest.background?.service_worker).toBe(
      resolve(build.dist, "test1.js")
    );
    const contentScripts = build.manifest.content_scripts;
    if (!contentScripts) throw new Error("content_scripts is undefined");
    const ts = contentScripts[0].ts;
    if (!ts) throw new Error("ts is undefined");
    expect(ts[0]).toBe(resolve(build.dist, "test2.js"));
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
    expect(ts[0]).toBe(resolve(build.dist, "test1.js"));
    expect(ts[1]).toBe(resolve(build.dist, "test2.js"));
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
    expect(ts[0]).toBe(resolve(build.dist, "test1.js"));
    const ts2 = contentScripts[1].ts;
    if (!ts2) throw new Error("ts2 is undefined");
    expect(ts2[0]).toBe(resolve(build.dist, "test2.js"));
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
    expect(build.manifest.action?.default_popup).toContain(
      "dist" + sep + "popup-"
    );
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
    expect(build.manifest.options_page).toContain(
      "dist" + sep + "optionsPage-"
    );
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
    expect(build.manifest.options_ui?.page).toContain(
      "dist" + sep + "optionsUI-"
    );
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
    expect(build.manifest.background?.service_worker).toBe(
      resolve(build.dist, "test1.js")
    );
    const contentScripts = build.manifest.content_scripts;
    if (!contentScripts) throw new Error("content_scripts is undefined");
    const ts = contentScripts[0].ts;
    if (!ts) throw new Error("ts is undefined");
    expect(ts[0]).toBe(resolve(build.dist, "test1.js"));
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
    expect(build.manifest.background?.service_worker).toBe(
      resolve(build.dist, "test1.js")
    );
    const contentScripts = build.manifest.content_scripts;
    if (!contentScripts) throw new Error("content_scripts is undefined");
    const ts = contentScripts[0].ts;
    if (!ts) throw new Error("ts is undefined");
    expect(ts[0]).toBe(resolve(build.dist, "test1.js"));
    expect(ts[1]).toBe(resolve(build.dist, "test2.js"));
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
    expect(build.manifest.background?.service_worker).toBe(
      resolve(build.dist, "test1.js")
    );
    const contentScripts = build.manifest.content_scripts;
    if (!contentScripts) throw new Error("content_scripts is undefined");
    const ts = contentScripts[0].ts;
    if (!ts) throw new Error("ts is undefined");
    expect(ts[0]).toBe(resolve(build.dist, "test1.js"));
    const ts2 = contentScripts[1].ts;
    if (!ts2) throw new Error("ts2 is undefined");
    expect(ts2[0]).toBe(resolve(build.dist, "test2.js"));
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
    expect(build.manifest.background?.service_worker).toBe(
      resolve(build.dist, "test1.js")
    );
    const contentScripts = build.manifest.content_scripts;
    if (!contentScripts) throw new Error("content_scripts is undefined");
    const ts = contentScripts[0].ts;
    if (!ts) throw new Error("ts is undefined");
    expect(ts[0]).toBe(resolve(build.dist, "test2.js"));
    expect(ts[1]).toBe(resolve(build.dist, "test3.js"));
    const ts2 = contentScripts[1].ts;
    if (!ts2) throw new Error("ts2 is undefined");
    expect(ts2[0]).toBe(resolve(build.dist, "test3.js"));
    expect(ts2[1]).toBe(resolve(build.dist, "test2.js"));
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
    expect(build.manifest.background?.service_worker).toBe(
      resolve(build.dist, "test1.js")
    );
    const contentScripts = build.manifest.content_scripts;
    if (!contentScripts) throw new Error("content_scripts is undefined");
    const ts = contentScripts[0].ts;
    if (!ts) throw new Error("ts is undefined");
    expect(ts[0]).toBe(resolve(build.dist, "test2.js"));
    expect(build.manifest.action?.default_popup).toContain(
      "dist" + sep + "popup-"
    );
    expect(build.manifest.options_page).toContain(
      "dist" + sep + "optionsPage-"
    );
    expect(build.manifest.options_ui?.page).toContain(
      "dist" + sep + "optionsUI-"
    );

    const popup = await Bun.file(build.manifest.action?.default_popup).text();
    expect(popup).toContain(resolve(build.dist, "test3.js"));
    const optionsPage = await Bun.file(build.manifest.options_page).text();
    expect(optionsPage).toContain(resolve(build.dist, "test4.js"));
    const optionsUI = await Bun.file(build.manifest.options_ui?.page).text();
    expect(optionsUI).toContain(resolve(build.dist, "src/test5.js"));
  });
});

describe("writeManifest", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("test with minimal config", async () => {
    build.manifest = defineManifest({
      name: "test",
      version: "0.0.1",
    });

    await build.writeManifest();

    expect(Bun.write).toHaveBeenCalledTimes(1);
    const content = await Bun.file(resolve(build.dist, "manifest.json")).text();
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
    const content = await Bun.file(resolve(build.dist, "manifest.json")).text();
    expect(content).toContain('"js": [');
    expect(content).toContain('"test1.js"');
  });
});
