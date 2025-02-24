# BCE

The program **bce** will do all of the heavy lifting.
It will read the contents of the manifest, extract all neccessary file paths, transpile them into the **outdir** and also copy referenced assets.

At first it will just extract the entrypoints from the manifest itself.
If there are any html files or other referenced files, Bun will automatically copy the linked scripts and assets into the **outdir** and change the internal links to point to them.
With the resulting file paths, the manifest will be updated to reflect the new location of the files.

It should handle every input either with an posix, win32, absolute or relative path, but the resulting **manifest.json** will only contain posix relative paths, because chrome can only deal with those.

## Exports

If you use modular code with import and export statements, you can still do this for your extension, even if you use that file directly in your **manifest.ts**.
Normally chrome cannot understand export conditions, because you cannot import it somewhere else.
But they are quite useful for testing purposes, because you can just import your code, you want to test.
To achieve this, there is a built-in plugin, that strips your ts file from all export statements, so you can still use them in your code, but chrome will not have any export statements.

## SASS

There is also a built-in plugin to transform **SCSS** files into regular **CSS**.
The builder has a custom hook for **.scss** files, so it will launch the internal plugin and use [SASS](https://www.npmjs.com/package/sass) to compile the file back into css.
It will then be picked up by the default css loader of the builder and will bundle and minify this code to create a single resulting css file.
Unfortunately SASS is not as fast as bun itself, so if there is a scss file linked in your project, it will take longer than usual to tranform the code.
