# Manifest

The file **manifest.ts** is the centre of your entire application.
Every root file will be listed here and represent the entrypoints for your extension.
So it is really important to enter the right values for each property.
And typescript makes that at least a little bit easier, because you can be sure that you have at least the right type.
You can write your code in typescript and just enter the path (relative or absolute) to the file.
BCE will take care of it and transpiles the file and saves the resulting js file inside the **outdir**.
All linked files will be transpiled as well, so you don't have to worry about anything.

## File

With a helper function called **defineManifest** you can define your properties with Intellisense, similar to [Config](./config).
The **manifest_version** is already predefined internally to a value of 3, because ManifestV3 is the only supported format.
The two other required properties **name** and **version** have to be set in any case.
Afterwards you only have optional properties left, which you can set as you like.

One important change is the property **js** inside of **content_scripts** is renamed to **ts** to better reflect the file type.
In the process, it will be changed back into **js** so chrome can properly read it.

## Public

You also have the ability to provide a public folder, in which you can store all of your assets, which are needed for your extension.
This folder will just be copied into the **outdir**, while the links inside of the manifest will be changed to reflect new location.
