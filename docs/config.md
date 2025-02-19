# Config

## File

You can create your own config file to overwrite the default values used for bundling and folder locations.
For that you need to create a file named **bce.config.ts**, where you can also use a helper function similar to
the [Manifest](/manifest) to declare your properties with Intellisense.

```ts
import { defineConfig } from "bun-chrome-extension-dev";

export default defineConfig({});
```

## API

### **minify**

Whether to enable minification.
This option will just be passed to the builder.
Default **false**

To enable all minification options:

```ts
minify: true;
```

To granularly enable certain minifications:

```ts
minify: {
  whitespace: true,
    identifiers
:
  true,
    syntax
:
  true
}
```

### **outdir**

The directory where output files will be written.
Default **dist**

```ts
outdir: "dist";
```

### **sourcemap**

Specifies the type of sourcemap to generate.  
Possible options are: **"external"**, **"inline"**, **"linked"**, **"none"**  
Default **"none"**

```ts
sourcemap: "none";
```
