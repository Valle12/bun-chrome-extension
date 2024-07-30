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
  });

  test("inquirer should get the right answer", async () => {
    const index = new Index();
    await index.init();
    expect(inquirer.input).toHaveBeenCalledTimes(1);
    expect(Bun.file).toHaveBeenCalledTimes(5);
    expect(Bun.write).toHaveBeenCalledTimes(5);

    const package_file = await Bun.file(
      resolve("test-project", "package.json")
    ).text();
    const readme_file = await Bun.file(
      resolve("test-project", "README.md")
    ).text();
    const files = await readdir(resolve("test-project"));
    expect(package_file).toMatch(`"name": "test-project"`);
    expect(readme_file).toMatch(`# test-project`);
    expect(files.length).toBe(5);
  });
});
