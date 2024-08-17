import { Build } from "bun-chrome-extension-dev";
import { rm } from "fs/promises";
import { resolve } from "path";
import { manifest } from "./manifest";

const dist = resolve(import.meta.dir, "dist");
await rm(dist, { recursive: true });
const build = new Build(manifest);
build.parse();
