import type { WebSocketType } from "./types";

export class Connection {
  ws: WebSocket | undefined;
  interval = 2000;

  async connect() {
    if (this.ws) return;

    try {
      await fetch("http://localhost:3000", { mode: "no-cors" });
    } catch (e) {
      console.log("Server not running :(");
      return;
    }

    this.ws = <WebSocket>new WebSocket("ws://localhost:3000");
    console.log("Connected to server!");
    this.addListener();
  }

  addListener() {
    if (!this.ws) return;

    this.ws.onmessage = event => {
      const type = event.data as WebSocketType;
      if (type === "reload") chrome.runtime.reload();
    };

    this.ws.onclose = () => {
      console.log("Connection closed!");
      console.clear();
      this.ws = undefined;
      this.retryConnect();
    };
  }

  retryConnect() {
    this.connect();
    setInterval(() => {
      this.connect();
    }, this.interval);
  }
}
