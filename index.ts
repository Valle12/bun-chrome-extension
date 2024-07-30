#!/usr/bin/env bun

import { input } from "@inquirer/prompts";
import { readdir } from "fs/promises";
import { resolve } from "path";

export class Index {
  PROJECT_FOLDER = "project";
  README_FILE = "README.md";
  PACKAGE_FILE = "package.json";

  constructor() {}

  async init() {
    const answer = await input({
      message: "What will be your project name?",
      required: true,
      default: "project-name",
    });

    // create local project
    const files = await readdir(resolve(import.meta.dir, this.PROJECT_FOLDER));
    for (const file of files) {
      let content = await Bun.file(
        resolve(import.meta.dir, this.PROJECT_FOLDER, file)
      ).text();
      if (file === this.README_FILE)
        content = content.replace(`# ${this.PROJECT_FOLDER}`, `# ${answer}`);
      if (file === this.PACKAGE_FILE)
        content = content.replace(
          `"name": "${this.PROJECT_FOLDER}"`,
          `"name": "${answer}"`
        );
      await Bun.write(resolve(answer, file), content);
    }
  }
}

if (import.meta.path === Bun.main) {
  const index = new Index();
  index.init();
}
