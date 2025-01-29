import { exists, readdir } from "fs/promises";
import { basename, extname, join, relative, resolve, win32 } from "path";
import type { BCEConfig, FullManifest, Icons, Properties } from "./types";

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

    if (entrypoints.length !== 0) {
      const result = await Bun.build({
        entrypoints,
        minify: this.config.minify,
        outdir: this.config.outdir,
        naming: "[dir]/[name]-[hash].[ext]",
      });

      const entrypointsLength = entrypoints.length;
      for (let i = 0; i < entrypointsLength; i++) {
        if (
          properties.get("action.default_popup") &&
          this.manifest.action &&
          this.manifest.action.default_popup
        ) {
          let file: string;
          const reference = this.manifest.action.default_popup;
          const property = this.fileToProperty.get(reference);
          if (property) {
            file = property;
          } else {
            const popupBase = basename(this.manifest.action.default_popup);
            const popup = popupBase.substring(0, popupBase.indexOf(".html"));
            let build = result.outputs.shift();
            while (
              build &&
              (build.kind !== "entry-point" ||
                build.loader !== "html" ||
                !basename(build.path).includes(popup))
            ) {
              build = result.outputs.shift();
            }
            if (!build) break;
            file = build.path;
            this.fileToProperty.set(reference, file);
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
          if (property) {
            file = property;
          } else {
            const optionsBase = basename(this.manifest.options_page);
            const options = optionsBase.substring(
              0,
              optionsBase.indexOf(".html")
            );
            let build = result.outputs.shift();
            while (
              build &&
              (build.kind !== "entry-point" ||
                build.loader !== "html" ||
                !build.path.includes(options))
            ) {
              build = result.outputs.shift();
            }
            if (!build) break;
            file = build.path;
            this.fileToProperty.set(reference, file);
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
          if (property) {
            file = property;
          } else {
            const optionsUiBase = basename(this.manifest.options_ui.page);
            const optionsUi = optionsUiBase.substring(
              0,
              optionsUiBase.indexOf(".html")
            );
            let build = result.outputs.shift();
            while (
              build &&
              (build.kind !== "entry-point" ||
                build.loader !== "html" ||
                !build.path.includes(optionsUi))
            ) {
              build = result.outputs.shift();
            }
            if (!build) break;
            file = build.path;
            this.fileToProperty.set(reference, file);
          }
          const relativeFilePath = relative(
            this.config.outdir,
            file
          ).replaceAll(/\\/g, "/");
          this.manifest.options_ui.page = relativeFilePath;
          properties.set("options_ui.page", false);
          continue;
        }

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

    if (this.manifest.background && this.manifest.background.service_worker) {
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

    if (this.manifest.action && this.manifest.action.default_popup) {
      const file = resolve(this.manifest.action.default_popup);
      this.manifest.action.default_popup = file;
      paths.push(file);
      properties.set("action.default_popup", true);
    }

    if (this.manifest.options_page) {
      const file = resolve(this.manifest.options_page);
      this.manifest.options_page = file;
      paths.push(file);
      properties.set("options_page", true);
    }

    if (this.manifest.options_ui && this.manifest.options_ui.page) {
      const file = resolve(this.manifest.options_ui.page);
      this.manifest.options_ui.page = file;
      paths.push(file);
      properties.set("options_ui.page", true);
    }

    return paths;
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
}
