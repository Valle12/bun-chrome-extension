import { exists, readdir } from "fs/promises";
import { Parser } from "htmlparser2";
import { dirname, extname, join, relative, resolve } from "path";
import type { Attributes, FullManifest, HTMLType, Properties } from "./types";

export class Build {
  dist = resolve(process.cwd(), "dist");
  public = resolve(process.cwd(), "public");
  manifest: FullManifest;
  fileToProperty: Map<string, string> = new Map();

  constructor(manifest: FullManifest) {
    this.manifest = manifest;
  }

  async parse() {
    await this.parseManifest();
    await this.copyPublic();
    await this.writeManifest();
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
        minify: true,
        outdir: this.dist,
      });

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
          const relativeFilePath = relative(this.dist, file).replace(
            /\\/g,
            "/"
          );
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
              const relativeFilePath = relative(this.dist, file).replace(
                /\\/g,
                "/"
              );
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
              relativeFilePath = relative(this.dist, resolvedScript).replace(
                /\\/g,
                "/"
              );
              this.fileToProperty.set(resolvedScripts[j], relativeFilePath);
            }
            content = content.replace(script, relativeFilePath);
            await Bun.write(file, content);
          }
          const relativeFilePath = relative(this.dist, file).replace(
            /\\/g,
            "/"
          );
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
              relativeFilePath = relative(this.dist, resolvedScript).replace(
                /\\/g,
                "/"
              );
              this.fileToProperty.set(resolvedScripts[j], relativeFilePath);
            }
            content = content.replace(script, relativeFilePath);
            await Bun.write(file, content);
          }
          const relativeFilePath = relative(this.dist, file).replace(
            /\\/g,
            "/"
          );
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
              relativeFilePath = relative(this.dist, resolvedScript).replace(
                /\\/g,
                "/"
              );
              this.fileToProperty.set(resolvedScripts[j], relativeFilePath);
            }
            content = content.replace(script, relativeFilePath);
            await Bun.write(file, content);
          }
          const relativeFilePath = relative(this.dist, file).replace(
            /\\/g,
            "/"
          );
          this.manifest.options_ui.page = relativeFilePath;
          properties.set("options_ui.page", false);
          continue;
        }
      }
    }
  }

  async copyPublic() {
    if (!(await exists(this.public))) return;
    const files = await readdir(this.public, {
      recursive: true,
      withFileTypes: true,
    });
    for (const file of files) {
      if (file.isDirectory()) continue;
      const filePath = resolve(this.public, file.parentPath, file.name);
      const source = Bun.file(filePath);
      const relativeFilePath = relative(this.public, filePath);
      const joinedFile = join("public", relativeFilePath);
      const outFile = resolve(this.dist, joinedFile);
      this.fileToProperty.set(filePath, joinedFile);
      await Bun.write(outFile, source);
    }
  }

  async writeManifest() {
    const file = resolve(this.dist, "manifest.json");
    await this.resolvePathsInManifest(this.manifest);
    let content = JSON.stringify(this.manifest, null, 2).replace(
      `"ts"`,
      `"js"`
    );

    for (const [key, value] of this.fileToProperty) {
      const replacedValue = value.replace(/\\/g, "/");
      const replacedKey = key.replace(/\\/g, "\\\\");
      content = content.replace(replacedKey, replacedValue);
    }

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

  private async resolvePathsInManifest(obj: any) {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "object") {
        await this.resolvePathsInManifest(value);
      } else if (typeof value === "string" && extname(value) !== "") {
        const file = resolve(this.public, "..", value);
        const existsFile = await exists(file);
        if (!existsFile) continue;
        obj[key] = file;
      }
    }
  }

  private async parseHTML(type: HTMLType) {
    const file = resolve(type.originalURL);
    const content = await Bun.file(file).text();
    const parser = new Parser({
      onopentag(name, attributes: Attributes) {
        if (name !== "script") return;
        const src = resolve(file, "..", attributes.src);

        if (type.resolvedScripts && type.scripts) {
          type.resolvedScripts.push(src);
          type.scripts.push(attributes.src);
        } else {
          type.resolvedScripts = [src];
          type.scripts = [attributes.src];
        }
      },
    });
    parser.write(content);
    parser.end();
  }
}
