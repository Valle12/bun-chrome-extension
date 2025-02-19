---
prev:
  text: "Home"
  link: "/"
---

# Quickstart

## New project

If you want to create a new project, you can use the provided features to automatically setup your project with required
files and a basic file structure.
It is really useful, because after your project creation you can just start developing, without worrying about a long
setup process.

```sh
bunx bun-chrome-extension
```

Then enter your project name and a new folder will be created.
With that, you did successfully setup your new project and can start working with it.
It also contains the package bun-chrome-extension-dev, which has all of the logic to create your output folder from the
given manifest.ts.

## Migrate in existing project

If you already have a project, where you want to add all of the functionalities, you can do this by first adding the
bun-chrome-extension-dev package.

```sh
bun add -D bun-chrome-extension-dev
```

Next step is to create the manifest.ts file with the following content:

```ts
import { defineManifest } from "bun-chrome-extension-dev";
import packageJson from "./package.json";

const { version } = packageJson;

const [major, minor, patch] = version.replace(/[^\d.-]+/g, "").split(/[.-]/);

export const manifest = defineManifest({
  name: "<<PROJECT NAME>>",
  version: `${major}.${minor}.${patch}`,
});
```

The last steps are to add a dev and build script to your package.json which creates the output files for you:

```json
{
  "scripts": {
    "dev": "bce --dev",
    "build": "bce"
  }
}
```
