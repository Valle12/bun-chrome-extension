# Dev

The dev mode is the most convenient way to develop your extension.
It spins up a file watcher, which watches you current working directory for any changes.
It also creates a WebSocket connection with the loaded extension, so the running process is able to communicate with the
extension itself.
If a change occurs, it will extract and rebuild the files from **manifest.ts** and reload you extension in the browser
automatically.

## Watcher

Unfortunately I am not able to use the integrated fs.watch functionality to watch the entire folder, because it needs to watch it recursively and linux does not have this functionaly yet.
So the process relies on [chokidar](https://www.npmjs.com/package/chokidar), which works reliable, but it seems way slower than fs.watch.
I hope that some day bun will include a native watcher, that will also work on linux, so I could switch to that again to speed up the process.
(If you have any idea on how to speed up the current watch configuration, please let me know)

## Server

The process starts a Bun server on port 3000.
When receiving **ws://localhost:3000** it will upgrade the connection to a WebSocket connection directly to the
extension.
With that you are able to communicate with the extension and trigger reloads, so you don't even have to reload your
extension manually.

## Extension

The extension needs some special logic.
Normally a service_worker inside a Chrome extension will go idle after 30 seconds.
To prevent that, the extension will do some async/await calls to a Chrome API, to stay active the entire time.
If the WebSocket connection gets closed (either due to a reload, closing of the browser or terminating the running
process) it will also reconnect, as soon as the Webserver is running again.
So normally you just use

```sh
bun run dev
```

and you are good to go.
It will be connected to the extension and as soon as you save one of your files in the cwd, it will trigger a reload, so
your extension will always be up to date

## Future plans

- ✅ Refresh extension on reload
- ❌ Hot reloading
