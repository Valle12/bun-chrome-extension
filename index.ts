#!/usr/bin/env bun
import { input } from "@inquirer/prompts";
import { mkdir, readdir, rm } from "fs/promises";
import { resolve } from "path";

export class Index {
  PROJECT_CONST = "bun-project-const";
  PROJECT_FOLDER = "project";
  IGNORE_FILES = ["node_modules", "bun.lockb", "test", "dist"];
  REPLACE_FILES = ["README.md", "package.json", "manifest.ts"];

  constructor() {}

  async init() {
    const answer = await input({
      message: "What will be your project name?",
      required: true,
      default: "project-name",
    });

    // clone project folder
    await Bun.spawn([
      "git",
      "clone",
      "--no-checkout",
      "https://github.com/Valle12/bun-chrome-extension.git",
      answer,
    ]).exited;
    await Bun.spawn(["git", "sparse-checkout", "init", "--no-cone"], {
      cwd: answer,
    }).exited;
    await Bun.spawn(["git", "sparse-checkout", "set", "project"], {
      cwd: answer,
    }).exited;
    await Bun.spawn(["git", "checkout", "master"], {
      cwd: answer,
    }).exited;

    // create local project
    const files = await readdir(resolve(import.meta.dir, this.PROJECT_FOLDER), {
      withFileTypes: true,
    });
    for (const file of files) {
      if (this.IGNORE_FILES.includes(file.name)) continue;
      if (file.isDirectory()) continue;
      let content = await Bun.file(
        resolve(import.meta.dir, this.PROJECT_FOLDER, file.name)
      ).text();
      if (this.REPLACE_FILES.includes(file.name))
        content = content.replace(this.PROJECT_CONST, answer);
      await Bun.write(resolve(answer, file.name), content);
    }
    await mkdir(resolve(answer, "public"));
    await rm(resolve(answer, this.PROJECT_FOLDER), {
      recursive: true,
      force: true,
    });
  }
}

if (import.meta.path === Bun.main) {
  const index = new Index();
  index.init();
}
