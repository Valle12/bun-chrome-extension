# BCE

The program **bce** will do all of the heavy lifting.
It will read the contents of the manifest, extract all neccessary file paths, transpile them into the **outdir** and also copy referenced assets.

At first it will just extract the entrypoints from the manifest itself.
If there are any html files or other referenced files, Bun will automatically copy the linked scripts and assets into the **outdir** and change the internal links to point to them.
With the resulting file paths, the manifest will be updated to reflect the new location of the files.

It should handle every input either with an posix, win32, absolute or relative path, but the resulting **manifest.json** will only contain posix relative paths, because chrome can only deal with those.
