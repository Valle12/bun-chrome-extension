import { rm } from "fs/promises";
import { Parser } from "htmlparser2";
import { resolve } from "path";
import { FullManifest } from "./types";

export class Build {
  dist = resolve(process.cwd(), "dist");

  async parseManifest(manifest: FullManifest) {
    await rm(this.dist, { recursive: true });

    const properties: { [key: string]: boolean } = {};
    const entrypoints = this.extractPaths(manifest, properties);
    const htmlTypeToPaths = await this.extractPathsFromHTML(
      manifest,
      properties
    );
    for (const key in htmlTypeToPaths) {
      entrypoints.push(...htmlTypeToPaths[key]);
    }

    if (entrypoints.length !== 0) {
      const result = await Bun.build({
        entrypoints,
        minify: true,
        outdir: this.dist,
      });

      const length = result.outputs.length;
      for (let i = 0; i < length; i++) {
        if (properties.background && manifest.background) {
          const file = result.outputs[0];
          result.outputs.shift();
          manifest.background.service_worker = file.path;
          properties.background = false;
          continue;
        }

        if (properties.content_scripts && manifest.content_scripts) {
          const contentScripts = manifest.content_scripts;
          for (const contentScript of contentScripts) {
            if (!contentScript.ts) continue;
            for (let j = 0; j < contentScript.ts.length; j++) {
              const file = result.outputs[0];
              result.outputs.shift();
              contentScript.ts[j] = file.path;
            }
          }
          properties.content_scripts = false;
          continue;
        }

        if (
          properties.popup &&
          manifest.action &&
          manifest.action.default_popup
        ) {
          const file = result.outputs[0];
          result.outputs.shift();
          manifest.action.default_popup = file.path;
          properties.popup = false;
          continue;
        }

        if (properties.optionsPage && manifest.options_page) {
          const file = result.outputs[0];
          result.outputs.shift();
          manifest.options_page = file.path;
          properties.optionsPage = false;
          continue;
        }

        if (
          properties.optionsUI &&
          manifest.options_ui &&
          manifest.options_ui.page
        ) {
          const file = result.outputs[0];
          result.outputs.shift();
          manifest.options_ui.page = file.path;
          properties.optionsUI = false;
          continue;
        }
      }
    }

    const manifestFile = resolve(this.dist, "manifest.json");
    const manifestContent = JSON.stringify(manifest, null, 2).replace(
      `"ts"`,
      `"js"`
    );
    await Bun.write(manifestFile, manifestContent);
  }

  extractPaths(manifest: FullManifest, properties: { [key: string]: boolean }) {
    const paths: string[] = [];

    if (manifest.background) {
      paths.push(resolve(manifest.background.service_worker));
      properties.background = true;
    }

    if (manifest.content_scripts) {
      for (const contentScript of manifest.content_scripts) {
        if (!contentScript.ts) continue;
        for (const ts of contentScript.ts) {
          paths.push(resolve(ts));
        }
      }
      properties.content_scripts = true;
    }

    return paths;
  }

  async extractPathsFromHTML(
    manifest: FullManifest,
    properties: { [key: string]: boolean }
  ) {
    const htmlTypeToPaths: { [key: string]: string[] } = {};

    if (manifest.action && manifest.action.default_popup) {
      const file = resolve(manifest.action.default_popup);
      const content = await Bun.file(file).text();
      this.parseHTML(content, htmlTypeToPaths, "popup", file);
      properties.popup = true;
    }

    if (manifest.options_page) {
      const file = resolve(manifest.options_page);
      const content = await Bun.file(file).text();
      this.parseHTML(content, htmlTypeToPaths, "optionsPage", file);
      properties.optionsPage = true;
    }

    if (manifest.options_ui && manifest.options_ui.page) {
      const file = resolve(manifest.options_ui.page);
      const content = await Bun.file(file).text();
      this.parseHTML(content, htmlTypeToPaths, "optionsUI", file);
      properties.optionsUI = true;
    }

    return htmlTypeToPaths;
  }

  private parseHTML(
    content: string,
    htmlTypeToPaths: { [key: string]: string[] },
    property: string,
    file: string
  ) {
    const parser = new Parser({
      onopentag(name, attributes) {
        if (name === "script") {
          const src = resolve(file, "..", attributes.src);
          if (htmlTypeToPaths[property]) {
            htmlTypeToPaths[property].push(src);
          } else {
            htmlTypeToPaths[property] = [src];
          }
        }
      },
    });
    parser.write(content);
    parser.end();
  }
}
