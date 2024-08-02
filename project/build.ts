import { Build } from "bun-chrome-extension-dev";
import { manifest } from "./manifest";

const build = new Build();
build.parseManifest(manifest);
