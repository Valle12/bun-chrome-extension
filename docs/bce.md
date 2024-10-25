# BCE

The program **bce** will do all of the hard lifting.
It will read the contents of the manifest, extract all neccessary file paths, transpile them and also copy the public folder while changing the links inside the manifest.

At first it will just extract the direct links from the manifest, so the links referring to **ts** files.
In the next step it will take a look into the **html** files and look for all referenced scripts in a **&lt;script&gt;** tag and links in a **&lt;link&gt;** tag (only css for now) and add them to the list of entrypoints for the builder.
The builder will then transpile all files into **outdir**.
With the resulting file paths, the manifest will be updated to reflect the new location of the files.
The last step is to copy the complete public folder and change all available asset links inside the manifest, e.g. icons.

It should handle every input either with an absolute or relative path, but the resulting **manifest.json** will only contain relative paths, because chrome can only deal with those.
