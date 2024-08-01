import * as inquirer from "@inquirer/prompts";
import { beforeEach, describe, expect, spyOn, test } from "bun:test";
import { readdir } from "fs/promises";
import { resolve } from "path";
import { Index } from "../index";

describe("index.ts", () => {
  beforeEach(() => {
    spyOn(inquirer, "input").mockResolvedValue("test-project");
    spyOn(Bun, "file");
    spyOn(Bun, "write");
    spyOn(String.prototype, "replace");
  });

  test("inquirer should get the right answer", async () => {
    const index = new Index();
    await index.init();
    expect(inquirer.input).toHaveBeenCalledTimes(1);
    expect(Bun.file).toHaveBeenCalledTimes(6);
    expect(Bun.write).toHaveBeenCalledTimes(6);
    expect(String.prototype.replace).toHaveBeenCalledTimes(3);

    const packageFile = await Bun.file(
      resolve("test-project", "package.json")
    ).text();
    const readmeFile = await Bun.file(
      resolve("test-project", "README.md")
    ).text();
    const manifestFile = await Bun.file(
      resolve("test-project", "manifest.ts")
    ).text();
    expect(packageFile).toMatch(`"name": "test-project"`);
    expect(readmeFile).toMatch(`# test-project`);
    expect(manifestFile).toMatch(`name: "test-project"`);

    const files = await readdir(resolve("test-project"));
    expect(files.length).toBe(6);
  });
});
