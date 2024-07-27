#!/usr/bin/env bun

import { input } from "@inquirer/prompts";
import { readdir } from "fs/promises";
import { resolve } from "path";

const PROJECT_FOLDER = "project";
const README_FILE = "README.md";
const PACKAGE_FILE = "package.json";

const answer = await input({
  message: "What will be your project name?",
  required: true,
  default: "project-name",
});

// create local project
const files = await readdir(resolve(import.meta.dir, PROJECT_FOLDER));
for (const file of files) {
  let content = await Bun.file(
    resolve(import.meta.dir, PROJECT_FOLDER, file)
  ).text();
  if (file === README_FILE)
    content = content.replace(`# ${PROJECT_FOLDER}`, `# ${answer}`);
  if (file === PACKAGE_FILE)
    content = content.replace(
      `"name": "${PROJECT_FOLDER}"`,
      `"name": "${answer}"`
    );
  await Bun.write(resolve(answer, file), content);
}
