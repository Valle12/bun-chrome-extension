#!/usr/bin/env bun
import { input } from "@inquirer/prompts";
import { readdir, rm } from "fs/promises";
import { resolve } from "path";

export class Index {
  PROJECT_CONST = "bun-project-const";
  PROJECT_FOLDER = "project";
  IGNORE_FILES = ["node_modules", "bun.lock", "test", "dist"];
  REPLACE_FILES = ["README.md", "package.json", "manifest.ts"];
  bunx = false;
  metaDir = import.meta.dir;

  constructor() {}

  async init() {
    const answer = await input({
      message: "What will be your project name?",
      required: true,
      default: "project-name",
    });

    if (this.bunx) this.metaDir = resolve(process.cwd(), answer);

    console.log("Setting up project...");

    // clone project folder
    await Bun.spawn({
      cmd: [
        "git",
        "clone",
        "--no-checkout",
        "https://github.com/Valle12/bun-chrome-extension.git",
        answer,
      ],
      stdout: "ignore",
      stderr: "ignore",
    }).exited;
    await Bun.spawn({
      cmd: ["git", "sparse-checkout", "init", "--no-cone"],
      cwd: answer,
      stdout: "ignore",
      stderr: "ignore",
    }).exited;
    await Bun.spawn({
      cmd: ["git", "sparse-checkout", "set", "project"],
      cwd: answer,
      stdout: "ignore",
      stderr: "ignore",
    }).exited;
    await Bun.spawn({
      cmd: ["git", "checkout", "main"],
      cwd: answer,
      stdout: "ignore",
      stderr: "ignore",
    }).exited;

    // create local project
    const files = await readdir(resolve(this.metaDir, this.PROJECT_FOLDER), {
      withFileTypes: true,
    });
    for (const file of files) {
      if (this.IGNORE_FILES.includes(file.name)) continue;
      if (file.isDirectory()) continue;
      resolve(this.metaDir, this.PROJECT_FOLDER, file.name);
      let content = await Bun.file(
        resolve(this.metaDir, this.PROJECT_FOLDER, file.name)
      ).text();
      if (this.REPLACE_FILES.includes(file.name))
        content = content.replace(this.PROJECT_CONST, answer);
      await Bun.write(resolve(answer, file.name), content);
    }
    await rm(resolve(answer, this.PROJECT_FOLDER), {
      recursive: true,
      force: true,
    });
    await rm(resolve(answer, ".git"), {
      recursive: true,
      force: true,
    });

    // install dependencies
    await Bun.spawn({
      cmd: ["bun", "install"],
      cwd: answer,
      stdout: "ignore",
      stderr: "ignore",
    }).exited;

    console.log("Project setup completed!");
  }
}

if (import.meta.path === Bun.main) {
  const index = new Index();
  index.bunx = true;
  index.init();
}
