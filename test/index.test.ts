import * as inquirer from "@inquirer/prompts";
import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { readdir, rm } from "fs/promises";
import { resolve } from "path";
import { Index } from "../index";

describe("composeTemplate.ts", () => {
  beforeEach(() => {
    spyOn(inquirer, "input").mockResolvedValue("test-project");
    spyOn(Bun, "file");
    spyOn(Bun, "write");
    type t = ReturnType<typeof Bun.spawn>;
    const result: t = { exited: Promise.resolve(0) } as t;
    spyOn(Bun, "spawn").mockImplementation(() => result);
    spyOn(String.prototype, "replace");
  });

  afterEach(async () => {
    await rm(resolve("test-project"), { recursive: true });
  });

  test("inquirer should get the right answer", async () => {
    const index = new Index();
    await index.init();
    expect(inquirer.input).toHaveBeenCalledTimes(1);
    expect(Bun.file).toHaveBeenCalledTimes(5);
    expect(Bun.write).toHaveBeenCalledTimes(5);
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
    expect(files.length).toBe(5);
  });
});
