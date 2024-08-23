# Bun Chrome Extension

This package tries to make the chrome extension development with typescript easier and safer.
It gives you Intellisense for your manifest, automatically builds your project, so that you have all necessary js files and assets in one place and uses bun for fast development.
The idea is based upon the [CRXJS Plugin](https://www.npmjs.com/package/@crxjs/vite-plugin) for [Vite](https://www.npmjs.com/package/vite).
It works quite well, but I had some problems with sourcemaps and I wanted to leverage the speed bonus and ease of use of bun to make the whole development process even faster.

You can install it using:

```sh
bunx bun-chrome-extension
```

Then follow the prompt and you will have you basic project setup.
It includes the [bun-chrome-extension-dev](https://www.npmjs.com/package/bun-chrome-extension-dev) package used for the whole logic of transpiling and setting the correct paths.
It also has a **manifest.ts** and an empty public folder that you can use to start your development!

The full documentation can be be found [here](https://valle12.github.io/bun-chrome-extension/).
