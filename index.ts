#!/usr/bin/env bun

import { input } from "@inquirer/prompts";
import { readdir } from "fs/promises";
import { resolve } from "path";

export class Index {
  PROJECT_CONST = "bun-project-const";
  PROJECT_FOLDER = "project";
  IGNORE_FILES = ["node_modules", "bun.lockb"];
  REPLACE_FILES = ["README.md", "package.json", "manifest.ts"];

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
      if (this.IGNORE_FILES.includes(file)) continue;
      let content = await Bun.file(
        resolve(import.meta.dir, this.PROJECT_FOLDER, file)
      ).text();
      if (this.REPLACE_FILES.includes(file))
        content = content.replace(this.PROJECT_CONST, answer);
      await Bun.write(resolve(answer, file), content);
    }
  }
}

if (import.meta.path === Bun.main) {
  const index = new Index();
  index.init();
}
