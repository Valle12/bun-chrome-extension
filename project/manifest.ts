import { defineManifest } from "bun-chrome-extension-dev";
import packageJson from "./package.json";
const { version } = packageJson;

const [major, minor, patch] = version.replace(/[^\d.-]+/g, "").split(/[.-]/);

export const manifest = defineManifest({
  name: "bun-project-const",
  version: `${major}.${minor}.${patch}`,
});
