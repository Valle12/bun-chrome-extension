import { exists, readdir } from "fs/promises";
import { Parser } from "htmlparser2";
import { dirname, extname, join, relative, resolve, win32 } from "path";
import type {
  Attributes,
  BCEConfig,
  FullManifest,
  HTMLType,
  Icons,
  Properties,
} from "./types";

export class Build {
  manifest: FullManifest;
  config: Required<BCEConfig>;
  // TODO potentially remove fileToProperty and set the contents of manifest in a different way
  // Also check for specific icons or default icons instead of checking all paths
  fileToProperty: Map<string, string> = new Map();
  cwd = process.cwd();

  constructor(manifest: FullManifest, config: BCEConfig = {}) {
    this.manifest = manifest;

    const defaultConfig: Required<BCEConfig> = {
      minify: true,
      sourcemap: "none",
      outdir: resolve(this.cwd, "dist"),
      public: resolve(this.cwd, "public"),
    };

    this.config = {
      minify: config.minify ?? defaultConfig.minify,
      sourcemap: config.sourcemap ?? defaultConfig.sourcemap,
      outdir: resolve(config.outdir ?? defaultConfig.outdir),
      public: resolve(config.public ?? defaultConfig.public),
    };
  }

  async parse() {
    await this.preprocessManifest();
    await this.parseManifest();
    await this.copyPublic();
    await this.writeManifest();
  }

  async preprocessManifest() {
    if (this.manifest.icons) {
      const icons = this.manifest.icons as Icons;
      for (const [key, value] of Object.entries(icons)) {
        if (!value) continue;
        icons[key] = win32.normalize(value).replace(/\\/g, "/");
      }
    }

    if (this.manifest.action && this.manifest.action.default_icon) {
      const icons = this.manifest.action.default_icon as Icons;
      for (const [key, value] of Object.entries(icons)) {
        if (!value) continue;
        icons[key] = win32.normalize(value).replace(/\\/g, "/");
      }
    }
  }

  async parseManifest() {
    const properties: Map<Properties, boolean> = new Map();
    const entrypoints = this.extractPaths(properties);
    const htmlTypes = await this.extractPathsFromHTML(properties);
    for (const type of htmlTypes) {
      entrypoints.push(resolve(type.originalURL));
      if (!type.resolvedScripts) continue;
      entrypoints.push(...type.resolvedScripts);
    }

    if (entrypoints.length !== 0) {
      const result = await Bun.build({
        entrypoints,
        minify: this.config.minify,
        outdir: this.config.outdir,
        naming: "[dir]/[name]-[hash].[ext]",
      });

      if (!result.success) {
        console.error(result.logs);
      }

      const entrypointsLength = entrypoints.length;
      for (let i = 0; i < entrypointsLength; i++) {
        if (
          properties.get("background.service_worker") &&
          this.manifest.background
        ) {
          let file: string;
          const reference = this.manifest.background.service_worker;
          const property = this.fileToProperty.get(reference);
          if (property) {
            file = property;
          } else {
            const build = result.outputs.shift();
            if (!build) break;
            file = build.path;
            this.fileToProperty.set(reference, file);
          }
          const relativeFilePath = relative(
            this.config.outdir,
            file
          ).replaceAll(/\\/g, "/");
          this.manifest.background.service_worker = relativeFilePath;
          properties.set("background.service_worker", false);
          continue;
        }

        if (
          properties.get("content_scripts.ts") &&
          this.manifest.content_scripts
        ) {
          const contentScripts = this.manifest.content_scripts;
          for (const contentScript of contentScripts) {
            if (!contentScript.ts) continue;
            for (let j = 0; j < contentScript.ts.length; j++) {
              let file: string;
              const reference = contentScript.ts[j];
              const property = this.fileToProperty.get(reference);
              if (property) {
                file = property;
              } else {
                const build = result.outputs.shift();
                if (!build) break;
                file = build.path;
                this.fileToProperty.set(reference, file);
              }
              const relativeFilePath = relative(
                this.config.outdir,
                file
              ).replaceAll(/\\/g, "/");
              contentScript.ts[j] = relativeFilePath;
            }
          }
          properties.set("content_scripts.ts", false);
          continue;
        }

        if (
          properties.get("action.default_popup") &&
          this.manifest.action &&
          this.manifest.action.default_popup
        ) {
          let file: string;
          const reference = this.manifest.action.default_popup;
          const property = this.fileToProperty.get(reference);
          const build = result.outputs.shift();
          if (!build) break;
          if (property) {
            file = property;
          } else {
            const newHTML = await import(build.path);
            file = resolve(dirname(build.path), newHTML.default);
            this.fileToProperty.set(reference, file);
          }
          let content = await Bun.file(file).text();
          const type = htmlTypes.shift();
          if (!type) break;
          const scripts = type.scripts;
          const resolvedScripts = type.resolvedScripts;
          if (!scripts || !resolvedScripts) break;
          for (let j = 0; j < scripts.length; j++) {
            const script = scripts[j];
            const property = this.fileToProperty.get(resolvedScripts[j]);
            let resolvedScript: string;
            let relativeFilePath: string;
            if (property) {
              relativeFilePath = property;
            } else {
              const buildResolved = result.outputs.shift();
              if (!buildResolved) break;
              resolvedScript = buildResolved.path;
              relativeFilePath = relative(
                this.config.outdir,
                resolvedScript
              ).replaceAll(/\\/g, "/");
              this.fileToProperty.set(resolvedScripts[j], relativeFilePath);
            }
            content = content.replaceAll(script, relativeFilePath);
            await Bun.write(file, content);
          }
          const relativeFilePath = relative(
            this.config.outdir,
            file
          ).replaceAll(/\\/g, "/");
          this.manifest.action.default_popup = relativeFilePath;
          properties.set("action.default_popup", false);
          continue;
        }

        if (properties.get("options_page") && this.manifest.options_page) {
          let file: string;
          const reference = this.manifest.options_page;
          const property = this.fileToProperty.get(reference);
          const build = result.outputs.shift();
          if (!build) break;
          if (property) {
            file = property;
          } else {
            const newHTML = await import(build.path);
            file = resolve(dirname(build.path), newHTML.default);
            this.fileToProperty.set(reference, file);
          }
          let content = await Bun.file(file).text();
          const type = htmlTypes.shift();
          if (!type) break;
          const scripts = type.scripts;
          const resolvedScripts = type.resolvedScripts;
          if (!scripts || !resolvedScripts) break;
          for (let j = 0; j < scripts.length; j++) {
            const script = scripts[j];
            const property = this.fileToProperty.get(resolvedScripts[j]);
            let resolvedScript: string;
            let relativeFilePath: string;
            if (property) {
              relativeFilePath = property;
            } else {
              const buildResolved = result.outputs.shift();
              if (!buildResolved) break;
              resolvedScript = buildResolved.path;
              relativeFilePath = relative(
                this.config.outdir,
                resolvedScript
              ).replaceAll(/\\/g, "/");
              this.fileToProperty.set(resolvedScripts[j], relativeFilePath);
            }
            content = content.replaceAll(script, relativeFilePath);
            await Bun.write(file, content);
          }
          const relativeFilePath = relative(
            this.config.outdir,
            file
          ).replaceAll(/\\/g, "/");
          this.manifest.options_page = relativeFilePath;
          properties.set("options_page", false);
          continue;
        }

        if (
          properties.get("options_ui.page") &&
          this.manifest.options_ui &&
          this.manifest.options_ui.page
        ) {
          let file: string;
          const reference = this.manifest.options_ui.page;
          const property = this.fileToProperty.get(reference);
          const build = result.outputs.shift();
          if (!build) break;
          if (property) {
            file = property;
          } else {
            const newHTML = await import(build.path);
            file = resolve(dirname(build.path), newHTML.default);
            this.fileToProperty.set(reference, file);
          }
          let content = await Bun.file(file).text();
          const type = htmlTypes.shift();
          if (!type) break;
          const scripts = type.scripts;
          const resolvedScripts = type.resolvedScripts;
          if (!scripts || !resolvedScripts) break;
          for (let j = 0; j < scripts.length; j++) {
            const script = scripts[j];
            const property = this.fileToProperty.get(resolvedScripts[j]);
            let resolvedScript: string;
            let relativeFilePath: string;
            if (property) {
              relativeFilePath = property;
            } else {
              const buildResolved = result.outputs.shift();
              if (!buildResolved) break;
              resolvedScript = buildResolved.path;
              relativeFilePath = relative(
                this.config.outdir,
                resolvedScript
              ).replaceAll(/\\/g, "/");
              this.fileToProperty.set(resolvedScripts[j], relativeFilePath);
            }
            content = content.replaceAll(script, relativeFilePath);
            await Bun.write(file, content);
          }
          const relativeFilePath = relative(
            this.config.outdir,
            file
          ).replaceAll(/\\/g, "/");
          this.manifest.options_ui.page = relativeFilePath;
          properties.set("options_ui.page", false);
          continue;
        }
      }
    }
  }

  async copyPublic() {
    if (!(await exists(this.config.public))) return;
    const files = await readdir(this.config.public, {
      recursive: true,
      withFileTypes: true,
    });
    for (const file of files) {
      if (file.isDirectory()) continue;
      const filePath = join(relative(this.cwd, file.parentPath), file.name);
      const filePathResolved = resolve(this.cwd, filePath);
      const linuxFilePath = filePath.replaceAll(/\\/g, "/");
      const resolvedLinuxFilePath = filePathResolved.replaceAll(/\\/g, "/");
      const splitPublic = this.config.public.replaceAll(/\\/g, "/").split("/");
      const publicDir =
        splitPublic.length > 0
          ? splitPublic[splitPublic.length - 1]
          : this.config.public;
      const outFile = resolve(
        this.config.outdir,
        publicDir,
        relative(this.config.public, filePathResolved)
      );
      const source = Bun.file(resolvedLinuxFilePath);
      this.fileToProperty.set(filePath, linuxFilePath);
      this.fileToProperty.set(filePathResolved, linuxFilePath);
      this.fileToProperty.set(linuxFilePath, linuxFilePath);
      this.fileToProperty.set(resolvedLinuxFilePath, linuxFilePath);
      await Bun.write(outFile, source);
    }
  }

  async writeManifest() {
    const file = resolve(this.config.outdir, "manifest.json");
    this.changeOutPathsInManifest(this.manifest);
    const content = JSON.stringify(this.manifest, null, 2);
    await Bun.write(file, content);
  }

  extractPaths(properties: Map<Properties, boolean>) {
    const paths: string[] = [];

    if (this.manifest.background) {
      const file = resolve(this.manifest.background.service_worker);
      this.manifest.background.service_worker = file;
      paths.push(file);
      properties.set("background.service_worker", true);
    }

    if (this.manifest.content_scripts) {
      for (const contentScript of this.manifest.content_scripts) {
        if (!contentScript.ts) continue;
        for (let i = 0; i < contentScript.ts.length; i++) {
          const file = resolve(contentScript.ts[i]);
          contentScript.ts[i] = file;
          paths.push(file);
        }
      }
      properties.set("content_scripts.ts", true);
    }

    return paths;
  }

  async extractPathsFromHTML(properties: Map<Properties, boolean>) {
    const htmlFiles: HTMLType[] = [];

    if (this.manifest.action && this.manifest.action.default_popup) {
      const type: HTMLType = {
        originalURL: this.manifest.action.default_popup,
        property: "action.default_popup",
      };
      await this.parseHTML(type);
      htmlFiles.push(type);
      properties.set("action.default_popup", true);
    }

    if (this.manifest.options_page) {
      const type: HTMLType = {
        originalURL: this.manifest.options_page,
        property: "options_page",
      };
      await this.parseHTML(type);
      htmlFiles.push(type);
      properties.set("options_page", true);
    }

    if (this.manifest.options_ui && this.manifest.options_ui.page) {
      const type: HTMLType = {
        originalURL: this.manifest.options_ui.page,
        property: "options_ui.page",
      };
      await this.parseHTML(type);
      htmlFiles.push(type);
      properties.set("options_ui.page", true);
    }

    return htmlFiles;
  }

  private changeOutPathsInManifest(obj: any) {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "object") {
        if (typeof key === "string" && key === "ts") {
          obj.js = value;
          delete obj.ts;
        } else {
          this.changeOutPathsInManifest(value);
        }
      } else if (typeof value === "string" && extname(value)) {
        const filePath = this.fileToProperty.get(value);
        if (!filePath) continue;
        obj[key] = filePath;
      }
    }
  }

  private async parseHTML(type: HTMLType) {
    const file = resolve(type.originalURL);
    const content = await Bun.file(file).text();
    const parser = new Parser({
      onopentag(name, attributes: Attributes) {
        if (name === "script") {
          const src = resolve(file, "..", attributes.src);

          if (type.resolvedScripts && type.scripts) {
            type.resolvedScripts.push(src);
            type.scripts.push(attributes.src);
          } else {
            type.resolvedScripts = [src];
            type.scripts = [attributes.src];
          }
        } else if (
          name === "link" &&
          attributes.rel === "stylesheet" &&
          !attributes.href.includes("http")
        ) {
          const href = resolve(file, "..", attributes.href);

          if (type.resolvedScripts && type.scripts) {
            type.resolvedScripts.push(href);
            type.scripts.push(attributes.href);
          } else {
            type.resolvedScripts = [href];
            type.scripts = [attributes.href];
          }
        }
      },
    });
    parser.write(content);
    parser.end();
  }
}
